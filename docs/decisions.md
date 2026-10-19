# Engineering Decisions Log

This log documents the pivotal architecture and data modeling decisions made for the Editorial Workflow Platform, detailing what was chosen, what was rejected, the technical trade-offs, and decisions that were subsequently reversed.

---

## Decision 1: Revision Model & Content Storage (Dual-Layer vs. Pure Revisions)

- **Chose:** A **Hybrid Revision Model**: `articles` maintains the currently active `title` and `body` directly, while `article_revisions` stores full snapshots of historical versions and active proposed drafts. A pointer `articles.published_revision_id` connects the live article to its canonical revision.
- **Rejected:** Pure Revision Container (where `articles` has no title or body, and every read query must join and resolve against `article_revisions`).
- **Why:** In digital publishing, 95% of queries (search listings, section feeds, dashboard overviews, calendar exports) only need the current title and body. Denormalizing active content onto `articles` avoids costly joins on every listing query while keeping `article_revisions` strictly append-only for version history.

---

## Decision 2: Overdue Publication Alert State & Dismissal Tracking

- **Chose:** A **Schedule Generation Sequence (`schedule_sequence`)** with an `alert_dismissals` table: Each time an article is scheduled, its `schedule_sequence` increments (1, 2, 3...). Dismissals record `(article_id, schedule_sequence)`. Overdue queries check: `status = 'SCHEDULED' AND publish_at < NOW() AND NOT EXISTS (SELECT 1 FROM alert_dismissals WHERE article_id = a.id AND schedule_sequence = a.schedule_sequence)`.
- **Rejected:** A boolean flag `is_dismissed` on the article table, or comparing raw timestamps against a `dismissed_at` timestamp.
- **Why:** Goal 10 states: *"If the article is unpublished and Scheduled again with a new publish time that also passes while it is still not Published, the alert returns."* A simple boolean `is_dismissed` requires delicate reset logic that can easily be skipped during unpublishing. Relying on timestamp comparisons fails if an article is rescheduled for an earlier time or across timezones. The generation sequence makes each scheduling cycle an identifiable, discrete event that naturally revives alerts.

---

## Decision 3: Enforcing Audit Trail Immutability (Database Trigger vs. Application Code)

- **Chose:** A native **PostgreSQL Database Trigger (`BEFORE UPDATE OR DELETE ON timeline_events`)** that raises an exception on any mutation attempt.
- **Rejected:** Relying exclusively on application middleware and omitting PUT/DELETE endpoints in Express.
- **Why:** Goal 9 explicitly demands: *"Nothing in this timeline can be edited or deleted after the fact, including by editors."* Application-level protections only guard against HTTP requests. If a database administrator, an internal script, an ORM cascade, or an accidental SQL query runs against the database, application guards are bypassed. An engine-level trigger guarantees that history is permanently immutable at the physical storage layer.

---

## Decision 4: Background Job Worker vs. Query-Time Evaluation for Scheduled Publishing

- **Chose:** **Query-Time Status Evaluation & Explicit Publish Triggers**: Articles with `publish_at <= NOW()` are evaluated on query and can be promoted to `PUBLISHED` via transactional API endpoints (`/api/articles/:id/transition` or `/api/bulk/publish-due`).
- **Rejected:** Dedicated background cron daemon running Redis and BullMQ.
- **Later reversed:**
  - *Original Choice:* Initially planned to spin up a background worker with `node-cron` or BullMQ to auto-publish scheduled articles the exact second their `publish_at` arrived.
  - *What changed our mind:* On free-tier cloud platforms (Vercel, Render free tier), containers spin down when idle. Background timers either pause or desynchronize when the server sleeps. Setting up Redis adds operational fragility and external dependencies. Shifting to query-time evaluation ensures scheduled pieces are seamlessly accessible to viewers the moment their time has passed, without needing standing compute infrastructure.

---

## Decision 5: Language & Build Pipeline (Pure JavaScript ES Modules vs. TypeScript)

- **Chose:** **Node.js with JavaScript (ES Modules, `"type": "module"`)** and **React JSX with Vite**.
- **Rejected:** Full TypeScript compilation with `tsc` build pipelines.
- **Why:** The project priorities emphasize clean database architecture, state machine correctness, and immediate developer clarity. Using pure JavaScript with Prisma removes the build friction of duplicate TypeScript interface declarations and build-step transpilations, while Prisma Client still provides full autocomplete and runtime validation.

---

## Decision 6: Writer Section Non-Disclosure Policy (404 Not Found vs. 403 Forbidden)

- **Chose:** Returning **HTTP 404 Not Found** when a writer requests a section ID they are not assigned to (`GET /api/sections/:id`).
- **Rejected:** Returning HTTP 403 Forbidden.
- **Why:** Returning 403 reveals the existence of an internal or embargoed editorial desk simply because a valid ID was supplied. Returning 404 adheres to the zero-disclosure principle, preventing malicious or curious enumeration of unassigned sections.

---

## Decision 7: Writer Assignment Roster Privacy

- **Chose:** Scoping `/api/sections/:id/assignments` so that writers only see their own assignment entry for the section.
- **Rejected:** Allowing writers to enumerate all staff members assigned to a desk.
- **Why:** Internal newsroom staffing assignments, special investigative desk attachments, and contractor assignments should not be broadly enumeratable across staff without editorial clearance. Editors retain full visibility into the entire roster.

