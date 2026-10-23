# AI Prompt Log & Verification Record

This log records the AI prompts used throughout the design, implementation, and quality assurance phases of the Editorial Workflow Management System (*The Dispatch*), documenting the generated output and the critical engineering corrections made to ensure production stability.

---

## Phase 1: Database Architecture & Schema Design

### Prompt
> "Task: Design the Complete Database for an Editorial Workflow Management System... Act as a senior backend engineer and database architect... Analyze the complete requirements and produce a robust, normalized, implementation-ready PostgreSQL database design... Focus first on database architecture, schema design, relationships, constraints, workflow integrity, audit history, and documentation."

### Generated Output
A normalized PostgreSQL Prisma schema containing `users`, `sections`, `section_assignments`, `articles`, `article_revisions`, `timeline_events`, `article_comments`, and `alert_dismissals`.

### Engineering Corrections
- **Alert Reappearance on Reschedule (Goal 10 Edge Case):** The initial naive suggestion was a boolean `is_dismissed` on the article table. We replaced this with a discrete `schedule_sequence` generation integer and a dedicated `alert_dismissals` relation. This mathematically guarantees that if an article is rescheduled, the alert will reliably resurface when the new scheduled time passes.
- **Audit Immutability (Goal 9):** Recognized that Prisma schema alone cannot prevent an SQL `UPDATE` or `DELETE` on audit events. Added an explicit PostgreSQL PL/pgSQL trigger `trg_timeline_immutable` to guarantee append-only immutability at the database engine level.
- **Content Stability on Published Articles (Goal 4):** Clarified the distinction between live published content and working draft revisions, ensuring that opening a revision never overwrites the live text until the revision itself is published.

---

## Phase 2: Authentication & Role Authorization

### Prompt
> "Implement Phase 2: Authentication and Authorization for the Editorial Workflow Management System... Support JWT authentication, password hashing with bcrypt, role-based access control for EDITOR and WRITER, and prevent privilege escalation."

### Generated Output
Express authentication routes (`/api/auth/login`, `/api/auth/register`, `/api/auth/me`), JWT issuance with 7-day expiration, and auth middleware.

### Engineering Corrections
- **Privilege Escalation Prevention:** Enforced that the public registration endpoint `/api/auth/register` strictly creates `WRITER` accounts, rejecting any payload attempting to self-assign the `EDITOR` role with an explicit HTTP 403 Forbidden.
- **Constant-Time Verification:** Used `bcryptjs` with 10 salt rounds to eliminate timing attacks during credential checks.

---

## Phase 3: Section Management & Writer Assignments

### Prompt
> "Implement Phase 3: Section Management and Writer Assignments... Editors manage sections and writer assignments; writers have access strictly scoped to assigned sections."

### Generated Output
CRUD endpoints for sections, soft-archiving logic, and writer assignment endpoints.

### Engineering Corrections
- **Zero-Disclosure Security Policy:** When an unauthorized writer queries an unassigned section by ID (`GET /api/sections/:id`), the API returns HTTP 404 Not Found rather than 403 Forbidden, preventing attackers from probing and enumerating private editorial desk structures.
- **Assignment Privacy:** Writers calling `GET /api/sections/:id/assignments` only see their own active assignment record, preventing writers from enumerating newsroom staffing rosters.

---

## Phase 4: Article CRUD & Revision Management

### Prompt
> "Implement Phase 4: Article CRUD and Revision Management... Articles belong to sections and authors; revisions track content changes; timeline events capture audit logs; editorial comments support peer review."

### Generated Output
Article services for creating drafts, retrieving details, opening revisions, adding comments, and viewing audit timelines.

### Engineering Corrections
- **Author Forgery Prevention:** Replaced any request-body `authorId` parameters with the authenticated session user `req.user.id`, guaranteeing writers cannot ghost-author articles under another colleague's name.
- **Atomic Creation with Revision #1:** Ensured article creation and initial revision snapshot generation happen inside a single atomic database transaction (`prisma.$transaction`).

---

## Phase 5: Workflow State Machine Engine

### Prompt
> "Implement Phase 5: Editorial Workflow State Machine Engine... Strict transitions: Draft -> In Review -> Approved -> Scheduled -> Published. Prevent self-approval, ensure optimistic locking, and enforce revision lifecycle."

### Generated Output
Workflow state transition controllers and services supporting approval, scheduling, publishing, unpublishing, and revision swapping.

### Engineering Corrections
- **Strict Self-Approval Guard:** Implemented the newsroom integrity rule preventing an editor who authored an article from approving their own piece (`article.authorId !== req.user.id`), requiring a second distinct editor.
- **Optimistic Concurrency Control:** Enforced version incrementing on state transitions to protect against race conditions when multiple editors review the same queue simultaneously.
- **Published Content Stability:** Ensured opening Revision #2 on a live article does not alter the published article's active `title`, `body`, or `publishedRevisionId` until Revision #2 itself completes review and is explicitly published.

---

## Phase 6: Search, Pagination & Calendar CSV Export

### Prompt
> "Implement Phase 6: Article Discovery, Search, Pagination & Editorial Calendar... Server-side search over title and body, multi-param filtering, stable sorting, pagination metadata, and calendar CSV export."

### Generated Output
Search query builders utilizing PostgreSQL GIN index, paginated response envelopes, and CSV streaming routes.

### Engineering Corrections
- **CSV Formula Injection (CWE-1236) Neutralization:** Pre-processed all CSV export fields starting with `=, +, -, @, \t, \r` by prefixing a single quote `'` and wrapping in escaped double quotes to prevent malicious formula execution in Excel/Google Sheets.
- **Zero-Leak Pagination:** Filtered search results and total count calculations server-side by the requester's authorized desks, guaranteeing pagination totals never reveal the existence of unassigned stories.

---

## Phase 7: Bulk Workflow Operations

### Prompt
> "Implement Phase 7: Bulk Scheduling & Bulk Unpublishing... Support batch operations on eligible articles, report per-article outcomes, preserve timeline events, and handle concurrency safely."

### Generated Output
Bulk routes (`POST /api/articles/bulk-schedule`, `POST /api/articles/bulk-unpublish`) processing arrays of article IDs.

### Engineering Corrections
- **Partial Failure Resilience:** Handled each article in an independent sub-transaction so that an ineligible article (e.g. an unapproved draft in a bulk schedule request) fails gracefully with an explicit error reason while eligible articles successfully commit.
- **Batch Boundary Limits:** Capped maximum bulk batch size at 100 articles with duplicate ID deduplication to prevent denial-of-service and connection-pool exhaustion.

---

## Phase 8: Editorial Dashboard & Analytics

### Prompt
> "Implement Phase 8: Editorial Dashboard & Analytics... Production metrics, weekly publication trend chart, status breakdowns, and desk volume allocations."

### Generated Output
Dashboard service calculating pipeline distributions and 8-week publication trajectories.

### Engineering Corrections
- **Strict UTC Monday–Sunday Boundaries:** Corrected week calculation logic so that weekly publication counts consistently anchor to calendar Monday 00:00:00 UTC through Sunday 23:59:59 UTC, matching international journalism publishing standards.
- **Zero-Fill Trajectory:** Guaranteed that weeks with zero published articles return an explicit `{ count: 0 }` entry rather than being omitted, preventing jagged SVG visualization errors in the UI.

---

## Phase 9: Overdue Alerts & Modern Editorial UI

### Prompt
> "Implement Phase 9: Overdue Article Alerts + Modern Editorial UI... Detect scheduled articles that passed publishAt, support occurrence-based dismissal, and deliver a polished newsroom interface."

### Generated Output
Overdue alert detection routes (`GET /api/alerts/overdue`, `POST /api/articles/:id/alerts/dismiss`), notification badges, and React UI components.

### Engineering Corrections
- **Occurrence-Based Re-arming:** Tied alert dismissals to the article's discrete `schedule_sequence`. If an overdue article is rescheduled to a future date, its sequence increments, guaranteeing the alert will reliably resurface if the new deadline passes.
- **Role Permission Scoping:** Allowed writers to view alerts for their assigned sections for visibility, while strictly restricting the dismiss action to editors.

---

## Phase 10: Final QA, Verification & Submission Readiness

### Prompt
> "Phase 10 — Final QA, Integration Testing, Deployment & Submission Readiness... Audit and stabilize the implementation, verify end-to-end behavior, resolve integration defects, and prepare for evaluation."

### Generated Output & Actions
- Full regression verification across all 9 automated test suites: **390/390 checks passing (100%)**.
- End-to-end browser QA across desktop and mobile viewports verifying responsive drawer navigation, writer scoping, alert permission guards, and article filtering.
- Addition of `build` and `test:all` scripts to `server/package.json` to ensure clean workspace orchestration without Windows DLL locking.
- Complete documentation audit across architecture, schema, decisions, prompt logs, and submission guide.
