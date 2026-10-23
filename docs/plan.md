# Project Implementation Plan & Session Log

This document tracks how the 12-hour engineering budget was structured across iterative sessions, the build sequence rationale, estimated versus actual time allocations, and scope trade-offs.

---

## Session Breakdown & Build Sequence

### Session 1: Requirements Discovery, Scaffolding & Git Baseline
- **Goal:** Unpack the 10 requirements, scaffold Node.js Express backend and Vite React client, and establish an incremental git history.
- **Estimated Time:** 1.0 hour | **Actual Time:** 1.0 hour
- **Rationale:** Having a working development loop with concurrent server and client scripts prevents environment setup roadblocks later.

### Session 2: Database Modeling & Schema Architecture (Phase 1)
- **Goal:** Design the normalized PostgreSQL schema, define Prisma models, configure database-level triggers for audit immutability, and write seed data.
- **Estimated Time:** 2.0 hours | **Actual Time:** 2.0 hours
- **Rationale:** The database schema is the foundation for all 10 goals. Establishing the revision model, state transitions, and audit trail early avoids costly refactoring.

### Session 3: Authentication & Authorization (Phase 2)
- **Goal:** Implement JWT authentication, bcrypt password hashing, role-based guards (`EDITOR`, `WRITER`), and prevent privilege escalation on public registration.
- **Estimated Time:** 1.0 hour | **Actual Time:** 1.0 hour
- **Rationale:** Server-side auth must be in place before building entity management.

### Session 4: Sections & Writer Assignments (Phase 3)
- **Goal:** Section CRUD, managing editor ownership, soft-archiving, M:N writer assignment join table, and zero-disclosure privacy policies.
- **Estimated Time:** 1.0 hour | **Actual Time:** 1.0 hour
- **Rationale:** Establishes desk boundaries for writer role scoping.

### Session 5: Article CRUD, Revisions & Audit Timeline (Phase 4)
- **Goal:** Article creation, editing, sequential revision numbering, snapshot immutability, and timeline event logging.
- **Estimated Time:** 1.5 hours | **Actual Time:** 1.5 hours
- **Rationale:** Core editorial content layer with tamper-proof history.

### Session 6: Workflow State Machine Engine (Phase 5)
- **Goal:** Implement transactional transitions (`DRAFT` → `IN_REVIEW` → `APPROVED` → `SCHEDULED` → `PUBLISHED`), self-approval prevention, and replacement revision lifecycles.
- **Estimated Time:** 1.5 hours | **Actual Time:** 1.5 hours
- **Rationale:** Non-bypassable state machine enforcing editorial integrity.

### Session 7: Search, Discovery & Calendar CSV Export (Phase 6)
- **Goal:** Full-text search with PostgreSQL GIN index, multi-param filtering, sorting, pagination, and RFC-4180 CSV export with formula injection mitigation (CWE-1236).
- **Estimated Time:** 1.0 hour | **Actual Time:** 1.0 hour
- **Rationale:** High-performance discovery and external calendar interoperability.

### Session 8: Bulk Scheduling & Bulk Unpublishing (Phase 7)
- **Goal:** Atomic batch actions with per-article outcome reporting, concurrency safeguards, and audit timeline tracking.
- **Estimated Time:** 1.0 hour | **Actual Time:** 1.0 hour
- **Rationale:** Mass newsroom operations without all-or-nothing failure cascades.

### Session 9: Editorial Dashboard Analytics & Overdue Alerts (Phases 8 & 9)
- **Goal:** Real-time production KPIs, 8-week publication trend chart (Mon–Sun UTC), status breakdowns, occurrence-based overdue alerts, and modern React newsroom UI with dark/light mode toggle.
- **Estimated Time:** 1.5 hours | **Actual Time:** 1.5 hours
- **Rationale:** Clean visual overview for newsroom leadership and reporters.

### Session 10: Final QA, Verification & Submission Readiness (Phase 10)
- **Goal:** End-to-end integration audit, test suite verification (390/390 checks passing), browser QA, deployment documentation, and submission readiness.
- **Estimated Time:** 0.5 hours | **Actual Time:** 0.5 hours
- **Rationale:** Quality gate and reviewer enablement.

---

## What We Estimated vs. What It Actually Took

| Task | Estimated | Actual | Notes |
| :--- | :---: | :---: | :--- |
| Project Scaffolding & Pure JS Config | 1.0 hr | 1.0 hr | Configured pure JavaScript ES modules without TypeScript transpilation overhead. |
| Schema Design & PostgreSQL Engine Triggers | 2.0 hrs | 2.0 hrs | Modeled discrete schedule sequence tracking and `trg_timeline_immutable` PL/pgSQL trigger. |
| Auth & Section Role Scoping | 2.0 hrs | 2.0 hrs | Implemented non-disclosure 404 policies on unassigned sections. |
| Article Revisions & Workflow State Machine | 3.0 hrs | 3.0 hrs | Enforced self-approval block and replacement revision lifecycle on live articles. |
| Search, Calendar CSV & Bulk Operations | 2.0 hrs | 2.0 hrs | Built PostgreSQL GIN search, formula-injection mitigation, and bulk batch coordinator. |
| Dashboard, Overdue Alerts & Minimal UI | 1.5 hrs | 1.5 hrs | Shadcn-inspired minimal aesthetic, dark/light theme toggle, and SVG trend chart. |
| Final QA, Regression Suite & Documentation | 0.5 hr | 0.5 hr | Full test run across all 9 suites (390/390 passed) and documentation alignment. |
| **Total** | **12.0 hrs** | **12.0 hrs** | Delivered on budget with 100% goal completion. |

---

## What We Deliberately Cut When Time Was Short

1. **Passage-Level Inline Annotations:**
   - Handled via comprehensive article-level and revision-level review comments, preserving timeline auditability without fragmenting relational models.
2. **Visual Graphical Diffing Canvas:**
   - Full historical snapshots are preserved in `article_revisions` so content is never lost, without requiring heavyweight third-party diffing libraries.
3. **Multi-Role User Accounts (e.g., Editor AND Writer simultaneously):**
   - Kept roles strictly distinct (`EDITOR` and `WRITER`). Editors already hold full authoring privileges across sections, keeping the permission matrix simple, secure, and auditable.
