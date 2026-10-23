# Autonomous Scheduled Article Publishing Architecture & Operations Guide

## Overview

The **Editorial Workflow Management System** features an autonomous, multi-tenant-safe, transactional background scheduling engine that transitions articles from `SCHEDULED` to `PUBLISHED` state automatically when their target publication timestamp (`publishAt`) arrives.

The design strictly reuses the core workflow state machine (`publishArticle`), guarantees full timeline event immutability, protects against clock drift by referencing PostgreSQL database time (`NOW()`), uses optimistic concurrency control (`version`) to eliminate duplicate publications or race conditions, and attributes executions transparently to a system actor (`actorName: "System Scheduler"`, `actorId: null`) without impersonating human editors.

---

## 1. Chosen Execution Mechanism & Architecture

### Rationale: In-Process Timer + Authenticated HTTP Cron Trigger

Instead of introducing heavyweight third-party queue infrastructure (such as Inngest, BullMQ, or Redis) which adds external dependencies, vendor lock-in, and operational overhead to a single-server/serverless deployment, we chose a hybrid dual-trigger mechanism:

1. **In-Process Background Worker (`src/workers/scheduler.worker.js`)**:
   - Executes periodically via `setInterval` within the Node.js server process (default: every 30 seconds).
   - Ideal for continuous hosting platforms (Docker, Render Web Services, Railway, Fly.io, AWS ECS/EC2, Virtual Machines).
   - In-memory concurrency guard (`isCycleRunning`) prevents overlapping worker ticks if a batch takes longer than the interval.

2. **Authenticated HTTP Cron Endpoint (`POST /api/internal/cron/publish`)**:
   - Protected by `x-cron-secret` header or `Authorization: Bearer <secret>`.
   - Uses constant-time buffer comparison (`crypto.timingSafeEqual`) to eliminate timing attacks.
   - Ideal for serverless or ephemeral platforms (Vercel Cron, GitHub Actions, AWS EventBridge, Render Cron Job, EasyCron) where background daemons do not persist indefinitely.
   - Allows external orchestrators to invoke publishing ticks on demand or on a rigid cron schedule.

Both mechanisms share the exact same core processing logic (`processDueScheduledArticles()`).

---

## 2. Safeguards & Correctness Guarantees

### A. Database Clock Synchronization
To prevent errors caused by clock drift between host servers and the database, the scheduler queries PostgreSQL's database clock:
```sql
SELECT NOW() as now;
```
Articles are fetched using `publishAt <= databaseClock`. Publication timestamps (`publishedAt`) and state transitions are evaluated against this synchronized reference time.

### B. Prevention of Duplicate & Stale Publications
- **Optimistic Concurrency Locking**: The `articles.version` integer is incremented atomically inside the Prisma transaction:
  ```javascript
  await tx.article.update({
    where: { id: articleId, version: article.version },
    data: { status: 'PUBLISHED', version: { increment: 1 }, ... }
  });
  ```
  If another worker or an editor modifies the article concurrently, the update fails with Prisma `P2025` and is caught and handled safely as a 409 Conflict.
- **Schedule Sequence Validation**: When an article is rescheduled, its `scheduleSequence` counter increments. Stale background tasks attempting to publish an older schedule sequence are rejected immediately before mutating the database.
- **Unpublishing Protection**: If an editor unpublishes an article back to `APPROVED` or `DRAFT` while a job is pending, the state machine verifies that the revision is in `SCHEDULED` status before proceeding.

### C. Approved Revision Selection
When an article is `SCHEDULED`, only the specific revision that was approved and scheduled is published. If an author opens a new `DRAFT` revision (e.g. Revision #2) while Revision #1 is scheduled, the scheduler resolves Revision #1 (`status: 'SCHEDULED'`), publishing only the approved snapshot while preserving the draft in its working state.

### D. Authorized System Actor & Timeline Immutability
- **System Actor**: Automated publications are executed on behalf of:
  ```javascript
  export const SYSTEM_ACTOR = Object.freeze({
    id: null,
    name: 'System Scheduler',
    role: 'EDITOR',
    isSystem: true,
  });
  ```
  The `actorId` is stored as `null` (satisfying database foreign keys without creating dummy user records), and `actorName` is explicitly set to `"System Scheduler"`.
- **Timeline Immutability**: The PostgreSQL trigger `trg_timeline_immutable` ensures that the `STATUS_CHANGED -> PUBLISHED` event cannot be edited or deleted by any user or query.

---

## 3. Environment Variables & Configuration

Configure the following variables in `server/.env`:

| Variable | Type | Default | Description |
|---|---|---|---|
| `CRON_SECRET` | string | `dispatch-internal-cron-secret-2026` | Secret key required to authenticate HTTP cron requests. |
| `ENABLE_SCHEDULER_WORKER` | boolean | `true` | Set to `false` in serverless environments or during test suites to disable the in-process timer. |
| `SCHEDULER_INTERVAL_MS` | integer | `30000` | Polling interval in milliseconds for the background worker (e.g. 30000 = 30 seconds). |
| `SCHEDULER_BATCH_SIZE` | integer | `50` | Maximum number of due articles to process in a single worker cycle. |

---

## 4. Local Execution

### Running Locally with the In-Process Worker
Start the backend server:
```bash
cd server
npm run dev
```
Upon startup, the server initializes the background worker:
```
[Editorial API] Server running on http://localhost:5000
[Scheduler Worker] Starting background publishing worker (interval: 30000ms)
```

### Triggering via HTTP (Local Testing)
You can manually trigger a publication cycle using `curl` or PowerShell:
```bash
curl -X POST http://localhost:5000/api/internal/cron/publish \
  -H "x-cron-secret: dispatch-internal-cron-secret-2026" \
  -H "Content-Type: application/json"
```

---

## 5. Production Cron Setup

### Option 1: Persistent Service (Render / Railway / Fly.io / Docker)
If running a long-lived Node.js process:
- Set `ENABLE_SCHEDULER_WORKER=true`.
- The in-process worker runs automatically in the background. No external cron runner required.

### Option 2: Vercel Cron (Serverless)
In `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/internal/cron/publish",
      "schedule": "* * * * *"
    }
  ]
}
```
In Vercel project environment variables, add `CRON_SECRET`. Vercel automatically passes `Authorization: Bearer <CRON_SECRET>`.

### Option 3: GitHub Actions (Scheduled Trigger)
Create `.github/workflows/scheduled-publishing.yml`:
```yaml
name: Scheduled Article Publishing
on:
  schedule:
    - cron: '*/5 * * * *' # Every 5 minutes
  workflow_dispatch:

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Publishing Cron
        run: |
          curl -s -X POST https://api.yourdomain.com/api/internal/cron/publish \
            -H "x-cron-secret: ${{ secrets.CRON_SECRET }}"
```

---

## 6. Timezone Handling

1. **Storage**: All timestamps (`publishAt`, `publishedAt`, `createdAt`, `updatedAt`) are stored as PostgreSQL `timestamptz` (UTC).
2. **Comparison**: Comparisons use UTC database time (`NOW()`), avoiding client-side timezone ambiguity or host OS discrepancies.
3. **Frontend**: The user interface formats timestamps using the browser's local timezone for editorial convenience, but sends ISO 8601 strings (e.g. `2026-10-24T12:00:00.000Z`) to the API.

---

## 7. Operational Monitoring & Health

### Status Endpoint
Retrieve scheduler operational telemetry:
```bash
curl -X GET http://localhost:5000/api/internal/cron/status \
  -H "x-cron-secret: dispatch-internal-cron-secret-2026"
```
Response:
```json
{
  "success": true,
  "data": {
    "isRunning": true,
    "isCycleRunning": false,
    "intervalMs": 30000,
    "batchSize": 50,
    "totalCyclesRun": 42,
    "lastRunAt": "2026-10-24T00:25:00.000Z",
    "lastResult": {
      "processedCount": 1,
      "publishedCount": 1,
      "skippedCount": 0,
      "failedCount": 0,
      "published": [{ "id": "cmv...1", "title": "Example Article" }],
      "durationMs": 42
    }
  },
  "timestamp": "2026-10-24T00:25:05.000Z"
}
```
