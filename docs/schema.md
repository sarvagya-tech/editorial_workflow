# Schema Specification & Data Architecture

## Table-by-Table Schema

### 1. `users`
Represents newsroom personnel with strict role-based access control.
- `id` (VARCHAR(30) / CUID, PK): Unique stable identifier.
- `name` (TEXT, NOT NULL): Full name for display and authorship.
- `email` (TEXT, NOT NULL, UNIQUE): Normalized lowercase email for sign-in.
- `password_hash` (TEXT, NOT NULL): Bcrypt-hashed password salt/digest (cost factor 10).
- `role` (ENUM `Role` [`WRITER`, `EDITOR`], NOT NULL, DEFAULT `'WRITER'`).
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `NOW()`).
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `NOW()`).

### 2. `sections`
Represents editorial coverage desks (e.g. Technology, Politics, Culture).
- `id` (VARCHAR(30) / CUID, PK): Unique stable identifier.
- `name` (TEXT, NOT NULL, UNIQUE): Section title.
- `description` (TEXT): Scope and coverage manifesto.
- `is_archived` (BOOLEAN, NOT NULL, DEFAULT `FALSE`): Soft-archive flag. Preserves all historical records, articles, and audit logs while hiding the section from default writer creation selectors.
- `owner_editor_id` (VARCHAR(30), NOT NULL, FK → `users.id`): The managing editor responsible for the section desk.
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `NOW()`).
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `NOW()`).

### 3. `section_assignments`
Explicit join model for the many-to-many relationship between `sections` and `users` (writers).
- `id` (VARCHAR(30) / CUID, PK): Unique join record ID.
- `section_id` (VARCHAR(30), NOT NULL, FK → `sections.id` ON DELETE CASCADE).
- `writer_id` (VARCHAR(30), NOT NULL, FK → `users.id` ON DELETE CASCADE).
- `assigned_by_id` (VARCHAR(30), NOT NULL, FK → `users.id` ON DELETE RESTRICT): The editor who authorized the assignment.
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `NOW()`).
- **Constraint:** `UNIQUE (section_id, writer_id)` prevents duplicate assignment of a writer to the same desk.

### 4. `articles`
The core lifecycle container for an editorial story.
- `id` (VARCHAR(30) / CUID, PK): Unique article identifier.
- `title` (VARCHAR(255), NOT NULL): Active headline.
- `body` (TEXT, NOT NULL): Active article content (Markdown/HTML).
- `status` (ENUM `ArticleStatus` [`DRAFT`, `IN_REVIEW`, `APPROVED`, `SCHEDULED`, `PUBLISHED`], NOT NULL, DEFAULT `'DRAFT'`).
- `section_id` (VARCHAR(30), NOT NULL, FK → `sections.id` ON DELETE RESTRICT).
- `author_id` (VARCHAR(30), NOT NULL, FK → `users.id` ON DELETE RESTRICT): Original writer.
- `publish_at` (TIMESTAMPTZ): Target future publication timestamp for scheduled articles.
- `published_at` (TIMESTAMPTZ): Exact moment the article went live.
- `schedule_sequence` (INTEGER, NOT NULL, DEFAULT 0): Incremented monotonically each time the article is newly scheduled. Uniquely links alert dismissals to a specific scheduling cycle.
- `published_revision_id` (VARCHAR(30), FK → `article_revisions.id` ON DELETE SET NULL, UNIQUE): Pointer to the currently live historical revision.
- `version` (INTEGER, NOT NULL, DEFAULT 1): Optimistic concurrency control lock.
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `NOW()`).
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `NOW()`).

### 5. `article_revisions`
Version history and proposed drafts for published pieces.
- `id` (VARCHAR(30) / CUID, PK): Unique revision identifier.
- `article_id` (VARCHAR(30), NOT NULL, FK → `articles.id` ON DELETE CASCADE).
- `revision_number` (INTEGER, NOT NULL): 1, 2, 3...
- `title` (VARCHAR(255), NOT NULL): Headline snapshot for this revision.
- `body` (TEXT, NOT NULL): Content snapshot for this revision.
- `status` (ENUM `ArticleStatus`, NOT NULL, DEFAULT `'DRAFT'`): Starts at DRAFT, moves through workflow.
- `author_id` (VARCHAR(30), NOT NULL, FK → `users.id` ON DELETE RESTRICT): Author of this proposed revision.
- `published_at` (TIMESTAMPTZ): Timestamp when this revision replaced live content.
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `NOW()`).
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `NOW()`).
- **Constraint:** `UNIQUE (article_id, revision_number)`.

### 6. `timeline_events`
Append-only, immutable audit ledger recording every lifecycle transition and action.
- `id` (VARCHAR(30) / CUID, PK).
- `article_id` (VARCHAR(30), NOT NULL, FK → `articles.id` ON DELETE RESTRICT): Never cascades deletion; history must be preserved.
- `actor_id` (VARCHAR(30), FK → `users.id` ON DELETE SET NULL): User who initiated the action (set to null if user is purged).
- `actor_name` (TEXT, NOT NULL): Snapshot of the user's name at event creation for permanent human readability.
- `event_type` (ENUM `TimelineEventType` [`CREATED`, `STATUS_CHANGED`, `CONTENT_UPDATED`, `REVISION_OPENED`, `REVISION_PUBLISHED`, `COMMENT_ADDED`, `SCHEDULED`, `UNPUBLISHED`, `ALERT_DISMISSED`], NOT NULL).
- `old_status` (ENUM `ArticleStatus`): Previous state before transition.
- `new_status` (ENUM `ArticleStatus`): New state after transition.
- `revision_id` (VARCHAR(30), FK → `article_revisions.id` ON DELETE SET NULL): Associated revision if applicable.
- `description` (TEXT, NOT NULL): Human-readable changelog entry.
- `metadata` (JSONB): Structured payload (timestamps, publish times, character diff counts).
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `NOW()`).

### 7. `article_comments`
Editorial discussions and review notes on articles.
- `id` (VARCHAR(30) / CUID, PK).
- `article_id` (VARCHAR(30), NOT NULL, FK → `articles.id` ON DELETE CASCADE).
- `revision_id` (VARCHAR(30), FK → `article_revisions.id` ON DELETE SET NULL): Optional link if comment targets a specific revision draft.
- `author_id` (VARCHAR(30), NOT NULL, FK → `users.id` ON DELETE RESTRICT).
- `content` (TEXT, NOT NULL): Discussion text.
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `NOW()`).
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `NOW()`).

### 8. `alert_dismissals`
Tracks editor dismissals of overdue publication alerts.
- `id` (VARCHAR(30) / CUID, PK).
- `article_id` (VARCHAR(30), NOT NULL, FK → `articles.id` ON DELETE CASCADE).
- `schedule_sequence` (INTEGER, NOT NULL): The specific scheduling occurrence dismissed.
- `dismissed_by_id` (VARCHAR(30), NOT NULL, FK → `users.id` ON DELETE RESTRICT).
- `dismissed_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `NOW()`).
- **Constraint:** `UNIQUE (article_id, schedule_sequence)`.

---

## Entity Relationships

- **One-to-Many (`1:N`):**
  - `users.id` → `sections.owner_editor_id` (One editor can own multiple sections).
  - `sections.id` → `articles.section_id` (One section contains many articles).
  - `users.id` → `articles.author_id` (One writer authors many articles).
  - `articles.id` → `article_revisions.article_id` (One article has many historical/draft revisions).
  - `articles.id` → `timeline_events.article_id` (One article has many immutable audit events).
  - `articles.id` → `article_comments.article_id` (One article has many review comments).

- **Many-to-Many (`M:N`):**
  - `sections` ↔ `users` via `section_assignments` (A section has multiple assigned writers; a writer can write for multiple sections).

- **One-to-One (`1:1` pointer):**
  - `articles.published_revision_id` → `article_revisions.id` (An article points to at most one currently live published revision).

---

## Enforcing Constraints: Database vs. Application Code

### Database Constraints (Engine Level)
- **Referential Integrity:** Foreign keys with strict deletion guards (`ON DELETE RESTRICT` on articles and audit logs; `ON DELETE CASCADE` on assignments and child comments).
- **Uniqueness Invariants:**
  - `users(email)` ensures no duplicate user accounts.
  - `sections(name)` ensures unique desk naming.
  - `section_assignments(section_id, writer_id)` prevents assigning a writer to a section twice.
  - `article_revisions(article_id, revision_number)` guarantees deterministic sequential revision numbering per article.
  - `alert_dismissals(article_id, schedule_sequence)` guarantees a dismissal is unique to that specific scheduling event.
- **Check Constraints (`CHECK`):**
  - `email = lower(email)` prevents case-sensitive auth bypasses.
  - `(publish_at IS NULL) OR (status IN ('SCHEDULED', 'PUBLISHED'))` guarantees draft/review articles cannot carry active schedule times.
- **Trigger-Enforced Immutability:**
  - `trg_timeline_immutable`: Intercepts any `UPDATE` or `DELETE` on `timeline_events` and raises an engine exception. History cannot be modified even via direct SQL access.
- **Trigger-Enforced Cross-Table Validation:**
  - `trg_verify_section_owner`: Ensures section owners must hold role `EDITOR`.
  - `trg_verify_published_revision`: Ensures an article's `published_revision_id` points only to a revision that belongs to *that exact article*.

### Application / Transactional Logic
- **Self-Approval Guard:** An author may never approve their own work. Because this involves cross-checking `article.author_id != current_user.id` and `current_user.role == 'EDITOR'`, it is enforced in the transactional backend service with detailed error messaging.
- **Content Mutation Invalidation:** When an article in `APPROVED` or `SCHEDULED` status has its title or body edited, the backend demotes its status back to `IN_REVIEW`, unsets `publish_at`, and creates a `CONTENT_UPDATED` timeline event atomically.
- **State Machine Transitions:** Transitions between `DRAFT` → `IN_REVIEW` → `APPROVED` → `SCHEDULED` → `PUBLISHED` are executed inside `prisma.$transaction()` with concurrency checks.

---

## What We Deliberately Denormalised

1. **`articles.title` and `articles.body`:**
   - *Why:* Even though full snapshots exist in `article_revisions`, denormalizing the current active content onto `articles` enables 95% of queries (search, section views, article lists, dashboard aggregations) to run directly against `articles` without performing an expensive join on `article_revisions` for every single row.
2. **`timeline_events.actor_name`:**
   - *Why:* If a user account is deleted or renamed years later, the historical timeline entry permanently retains the author's real name as it stood at the moment the editorial sign-off took place.
3. **`articles.schedule_sequence`:**
   - *Why:* Avoids scanning historical timeline events to figure out which scheduling attempt is currently active.

---

## What Would Break First at 100x Data?

1. **`timeline_events` Table Bloat:**
   - *The Bottleneck:* Because every keystroke edit, comment, status change, and revision logs an immutable event, `timeline_events` will grow 20x faster than `articles`. At 100x scale (millions of articles), `timeline_events` will contain hundreds of millions of rows.
   - *The Fix:* Implement **PostgreSQL Table Partitioning by Range (`created_at` or `article_id` hash)** and configure cold-storage archival for articles completed over 12 months ago.
2. **Text Search (`LIKE %...%` or Non-Indexed Queries):**
   - *The Bottleneck:* Performing `ILIKE '%query%'` across millions of long-form article bodies triggers sequential table scans, thrashing CPU and memory.
   - *The Fix:* We preemptively created a PostgreSQL GIN index on `to_tsvector('english', title || ' ' || body)`. At 100x scale, migrate search to dedicated search indices (Elasticsearch / Meilisearch) or read-replica full-text nodes.
3. **Weekly Aggregation Scans on Dashboard:**
   - *The Bottleneck:* Querying the 8-week publication trend with `WHERE published_at >= ...` requires scanning all published records across the newsroom.
   - *The Fix:* Implement a materialized view (`mv_weekly_editorial_stats`) refreshed hourly or on publication triggers.
