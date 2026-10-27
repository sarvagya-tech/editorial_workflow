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

## Decision 4: Autonomous Background Scheduled Publishing (In-Process Worker vs. Heavy Queue)

- **Chose:** An **In-Process Autonomous Background Worker (`scheduler.worker.js`)** coupled with an **Authenticated Webhook Trigger (`/api/internal/cron/publish`)** and **Database Clock Synchronization (`SELECT NOW()`)**. The worker evaluates due articles every 30 seconds using optimistic concurrency locking (`article.version`), eliminating race conditions while recording immutable audit events.
- **Rejected:** Heavy distributed queue architectures (e.g., Redis + BullMQ / Celery).
- **Later reversed & refined:**
  - *Original Choice:* Initially considered running external distributed Redis queues with BullMQ to schedule precise execution jobs.
  - *What changed our mind:* Redis adds operational cost, infrastructure fragility, and serialization overhead for an editorial workflow where batch sizes rarely exceed dozens of scheduled articles per hour. However, relying purely on client query-time evaluation meant that scheduled articles would remain unpublished if nobody visited the website.
  - *Resolution:* We implemented a lightweight, resilient in-process worker daemon that queries Neon PostgreSQL directly using `SELECT NOW()` to prevent local container clock drift, combined with an authenticated HTTP cron endpoint (`x-cron-secret`) for external orchestrators (Cloudflare Workers, AWS EventBridge, or Render Cron).

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

---

## Decision 8: Rejection of Hard Deletion on Articles (Permanent Editorial Record)

- **Chose:** Explicitly omitting hard DELETE endpoints on articles (`DELETE /api/articles/:id` returns `HTTP 405 Method Not Allowed`).
- **Rejected:** Supporting `DELETE /api/articles/:id` with cascading deletes.
- **Why:** In journalistic and newsroom operations, published stories, drafts under legal review, and editor corrections form an indelible institutional record. Hard-deleting an article would orphan or destroy historical timeline events, comments, and revision snapshots, violating Goal 9 ("History you cannot rewrite").

---

## Decision 9: Zero-Disclosure on Restricted Articles for Writers

- **Chose:** Returning **HTTP 404 Not Found** when a writer requests an article belonging to an unassigned section or another writer's restricted draft.
- **Rejected:** Returning HTTP 403 Forbidden.
- **Why:** Returning 403 confirms the presence of confidential or embargoed investigative pieces in the newsroom. Returning 404 preserves zero-knowledge isolation.

---

## Decision 10: Revision Snapshots vs. Direct In-Place Content Modification

- **Chose:** Enforcing that once an article is `PUBLISHED`, its content can never be modified through a generic `PATCH /api/articles/:id`. Instead, the author opens a new revision snapshot (`POST /api/articles/:id/revisions`).
- **Rejected:** Allowing live in-place edits on published articles.
- **Why:** Goal 4 demands: *"Once Published, an article's content cannot be edited directly — the writer opens a new revision instead, which starts its own path at Draft and replaces the current content only once that revision itself reaches Published."* This prevents stealth corrections and maintains an untampered canonical record of what the public saw.

---

## Decision 11: Workflow State Machine Architecture & Self-Approval Prevention

- **Chose:** A centralized workflow service (`workflow.service.js`) enforcing the strict transition pipeline `DRAFT` $\to$ `IN_REVIEW` $\to$ `APPROVED` $\to$ `SCHEDULED` $\to$ `PUBLISHED` (with `APPROVED` $\to$ `PUBLISHED` and unpublishing `SCHEDULED`/`PUBLISHED` $\to$ `APPROVED`), coupled with strict self-approval checks (`article.authorId === user.id || workingRevision.authorId === user.id`).
- **Rejected:** Permitting editors to approve articles they authored, or allowing clients to mutate workflow statuses through generic CRUD PATCH requests.
- **Why:** In newsrooms, four-eyes editorial governance ensures no single reporter or editor can write and publish unreviewed copy. Enforcing self-approval rejection on the backend (even when the caller possesses full EDITOR permissions) guarantees journalistic separation of concerns.

---

## Decision 12: Dual-Layer State Model for Published Article Revisions

- **Chose:** Decoupling article-level published availability from working revision lifecycle progression: when a replacement revision (e.g. Revision #2) is drafted on a published article, `articles.status` remains `PUBLISHED` (and `articles.publishedRevisionId` remains anchored to Revision #1), while Revision #2 progresses through `DRAFT` $\to$ `IN_REVIEW` $\to$ `APPROVED`. `articles.publishedRevisionId` and live active text shift only upon final publication of Revision #2.
- **Rejected:** Setting `articles.status` back to `IN_REVIEW`, which would unpublish the article and take it offline for public readers while a correction or follow-up was drafted.
- **Why:** In high-traffic publications, live news coverage must remain continuously accessible while follow-up revisions undergo editorial review.


