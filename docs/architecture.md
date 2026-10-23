# System Architecture

## Moving Pieces and Interactions

The Editorial Workflow Platform (*The Dispatch*) is architected as a clean, decoupled client-server web application with a relational database layer:

1. **Client Layer (Browser / SPA):**
   - Built with **React 18** and **Vite**, styled with **Tailwind CSS**, and utilizing **Lucide React** iconography.
   - Communicates with the backend exclusively through a typed JSON REST API via HTTP requests authenticated with Bearer JWT tokens.
   - Houses zero business logic regarding permissions or lifecycle transitions; all state changes are driven and verified by the server.

2. **Backend Application Layer (Node.js & Express):**
   - Built in **Node.js** (JavaScript ES modules) using **Express.js**.
   - Responsibilities:
     - Authentication & JWT token issuance/verification.
     - Role-based access control middleware (`requireEditor`, `requireWriter`).
     - Editorial Workflow Engine: enforces state machine transitions, self-approval guards, content invalidation, and revision swapping.
     - Query orchestrator: handles server-side filtering, text search, sorting, and cursor/page pagination.
     - Bulk action coordinator: iterates across batch requests and produces granular per-article outcome reports.
     - CSV streaming exporter for the editorial calendar.

3. **Data Layer (PostgreSQL & Prisma ORM):**
   - Managed **PostgreSQL** database (hosted on Neon / Supabase).
   - **Prisma Client** acts as the data-mapping abstraction, handling connection pooling, parameterized query generation, and schema migration tracking.
   - **PostgreSQL Database Engine**:
     - Enforces referential integrity (foreign keys).
     - Enforces uniqueness constraints on compound keys.
     - Native GIN indexing for full-text search.
     - PL/pgSQL database triggers enforcing append-only immutability on `timeline_events` and cross-table role validation.

```mermaid
graph TD
    User["Editor / Writer (Browser)"]
    subgraph Client["Frontend SPA (Port 5173)"]
        UI["React SPA + Tailwind CSS"]
        Router["Client Navigation"]
        State["Auth Context & API Client"]
    end

    subgraph Backend["Express Backend (Port 5000)"]
        AuthMiddleware["JWT & Role Authorization"]
        RouteHandlers["Route Controllers"]
        WorkflowEngine["Editorial Workflow Engine"]
        TxManager["Transaction Coordinator"]
    end

    subgraph Database["PostgreSQL Database (Neon)"]
        PrismaORM["Prisma Client"]
        Tables["Core Tables (Articles, Users, Revisions)"]
        AuditTriggers["PL/pgSQL Immutability Triggers"]
        FTS["GIN Full-Text Search Index"]
    end

    User -->|HTTP Requests| UI
    UI --> State
    State -->|JSON / REST (Bearer JWT)| AuthMiddleware
    AuthMiddleware --> RouteHandlers
    RouteHandlers --> WorkflowEngine
    WorkflowEngine --> TxManager
    TxManager --> PrismaORM
    PrismaORM --> Tables
    Tables --> AuditTriggers
    Tables --> FTS
```

---

## Where Each Piece Runs

- **Browser-Side Code:** Runs locally in modern browsers during development (Vite dev server on `http://localhost:5173`), and deployed as static assets to Vercel or Netlify for production.
- **Server-Side API Code:** Runs in Node.js v22 on `http://localhost:5000` (development), and deployed to Render, Railway, or Vercel Serverless Functions in production.
- **Database Engine:** Runs on a managed PostgreSQL instance provided by Neon (serverless Postgres with connection pooling and SSL).

---

## Request Path for a Representative User Action End-to-End

### Action: Editor Approves a Writer's Article (`IN_REVIEW` → `APPROVED`)

1. **User Action:**
   An editor (Sarah Jenkins, `editor@dispatch.com`) clicks **"Approve Article"** on the editorial review screen for an article authored by Maya Patel (`writer@dispatch.com`).
2. **Client Dispatch:**
   The client makes an authenticated HTTP request:
   `POST /api/articles/cly12345/transition`
   `Headers: { Authorization: "Bearer eyJhbGciOi...", Content-Type: "application/json" }`
   `Body: { targetStatus: "APPROVED", comment: "Verified sourcing and quotes." }`
3. **Transport & Authentication:**
   - Express receives the request.
   - `cors` middleware verifies origin.
   - `authenticate` middleware decodes and verifies the JWT signature, extracting `{ id: "user_sarah", role: "EDITOR", email: "editor@dispatch.com" }` and attaching it to `req.user`.
4. **Authorization & Precondition Validation:**
   - Route controller parses input using Zod: verifies `targetStatus` is valid enum value.
   - Hands execution to `WorkflowService.transitionArticle(...)`.
5. **Database Transaction Initiation (`prisma.$transaction`):**
   - Backend acquires an isolated transaction block (`BEGIN`).
   - Fetches article record with `authorId`, `status`, and `sectionId`.
   - **Self-Approval Check:** Verifies `article.authorId !== req.user.id`. (If the author is an editor trying to approve their own work, the server immediately aborts the transaction with HTTP 403: *"Editorial Integrity Rule: An author may never approve their own work"*).
   - **State Machine Check:** Verifies `article.status === 'IN_REVIEW'`. (If article is in `DRAFT`, rejects with HTTP 400).
6. **Data Mutation & Audit Logging:**
   - Updates `articles` record: sets `status = 'APPROVED'`, increments `version` for optimistic locking.
   - Inserts row into `timeline_events`:
     `{ articleId: "cly12345", actorId: "user_sarah", actorName: "Sarah Jenkins", eventType: "STATUS_CHANGED", oldStatus: "IN_REVIEW", newStatus: "APPROVED", description: "Approved by Sarah Jenkins (editor) — Note: 'Verified sourcing and quotes.'" }`
   - Database trigger `trg_timeline_immutable` acknowledges append-only insertion.
7. **Commit & Response:**
   - Transaction commits (`COMMIT`).
   - Server returns HTTP 200 with the updated article object and newly minted timeline event.
   - Client updates local state and displays visual confirmation with the new status badge.

---

## 4. Autonomous Scheduled Article Publishing Subsystem

To ensure articles scheduled for future publication transition to `PUBLISHED` state without requiring manual human intervention:
- **In-Process Background Worker (`src/workers/scheduler.worker.js`)**: Runs an in-memory interval (default: 30s) protected against overlapping ticks. Queries PostgreSQL `NOW()` database time to prevent clock skew.
- **Authenticated HTTP Cron Endpoint (`POST /api/internal/cron/publish`)**: Allows external cron runners (Vercel Cron, GitHub Actions, AWS EventBridge, Render Cron) to trigger publication with constant-time secret verification (`x-cron-secret`).
- **Core State Machine Reuse**: Fully invokes `publishArticle` within an isolated transaction (`prisma.$transaction`), using optimistic locking (`version`) and schedule sequence validation (`scheduleSequence`) to eliminate duplicate publications or stale executions.
- **Audit Immutability & System Actor**: Records atomic `STATUS_CHANGED -> PUBLISHED` timeline events authored by `SYSTEM_ACTOR` (`actorName: "System Scheduler"`, `actorId: null`) without impersonating editors.

---

## What We Decided *Not* to Build, and Why

1. **Heavyweight Message Queue / Microservice Infrastructure (Inngest, BullMQ, Celery):**
   - *Why rejected:* Spawning external Redis clusters or vendor-locked worker platforms introduces substantial orchestration, cost, and latency overhead.
   - *Alternative chosen:* **In-Process Worker + Authenticated HTTP Cron Endpoint:** Relies directly on PostgreSQL transactional guarantees and indexed queries (`status, publish_at`), remaining 100% portable across standard servers and serverless deployments.
2. **WebSocket Real-Time Connections:**
   - *Why rejected:* WebSockets add stateful connection management complexity, fail on serverless functions, and are not required for an editorial workflow with standard page navigation.
   - *Alternative chosen:* Short-interval polling / SWR revalidation on the alert navigation badge and dashboard metrics.
3. **Complex Markdown WYSIWYG Editor with Operational Transformation (OT/CRDT):**
   - *Why rejected:* The scenario specifies that concurrent multi-author live typing is not the workflow; writers submit drafts, and revisions lock the live article.
   - *Alternative chosen:* A clean, distraction-free markdown/prose editor with revision forking.
