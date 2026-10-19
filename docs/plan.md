# Project Implementation Plan & Session Log

This document tracks how the 12-hour engineering budget was structured across iterative sessions, the build sequence rationale, estimated versus actual time allocations, and scope trade-offs.

---

## Session Breakdown & Build Sequence

### Session 1: Requirements Discovery, Scaffolding & Git Baseline
- **Goal:** Unpack the 10 requirements from Assignment 17, scaffold Node.js Express backend and Vite React client, and establish an incremental git history.
- **Estimated Time:** 1.5 hours
- **Actual Time:** 1.5 hours
- **Why this order:** Having a working development loop with concurrent server and client scripts prevents environment setup roadblocks later.

### Session 2: Database Modeling & Schema Architecture (Current Milestone)
- **Goal:** Design the normalized PostgreSQL schema, define Prisma models, configure database-level check constraints and triggers for audit immutability, and write seed data.
- **Estimated Time:** 2.5 hours
- **Actual Time:** 2.5 hours
- **Why this order:** The database schema is the foundation for all 10 goals. Building UI or routes before establishing the revision model, state transitions, and audit trail leads to painful refactoring.

### Session 3: Core API Services & Workflow State Machine Engine
- **Goal:** Implement authentication (JWT + bcrypt), section assignment validation, and the transactional editorial state machine (`DRAFT` → `IN_REVIEW` → `APPROVED` → `SCHEDULED` → `PUBLISHED`).
- **Estimated Time:** 2.5 hours
- **Actual Time:** (Next phase)
- **Why this order:** Server-side enforcement of authorization and the self-approval block must be solid before connecting UI forms.

### Session 4: Search, Filtering, Pagination, Bulk Actions & Calendar CSV
- **Goal:** Implement server-side search over title/body with PostgreSQL GIN index, filters, sorting, bulk schedule/unpublish with per-article reporting, and CSV calendar export.
- **Estimated Time:** 2.0 hours
- **Actual Time:** (Upcoming)

### Session 5: Dashboard Analytics, Overdue Publication Alerts & Frontend Assembly
- **Goal:** Build the React newsroom UI, headline metrics, status/section breakdowns, 8-week published trend chart, overdue alert badge, and 1-click demo role switcher.
- **Estimated Time:** 2.5 hours
- **Actual Time:** (Upcoming)

### Session 6: Deployment & Final Verification
- **Goal:** Deploy database to Neon/Supabase, deploy app to Vercel/Render, populate live seed data, and run verification suite.
- **Estimated Time:** 1.0 hour
- **Actual Time:** (Upcoming)

---

## What We Estimated vs. What It Actually Took

| Task | Estimated | Actual | Notes |
|------|-----------|--------|-------|
| Project Scaffolding & JS Configuration | 1.0 hr | 1.0 hr | Switched from TypeScript to pure JS as per user direction. |
| Schema Design & State Machine Constraints | 2.5 hrs | 2.5 hrs | Added schedule generation tracking and PostgreSQL immutability trigger. |
| Seed Data Construction with Newsroom Context | 1.0 hr | 1.0 hr | Created realistic newsroom reporting stories across 4 desks. |

---

## What We Deliberately Cut When Time Was Short

1. **Passage-Level Inline Annotations:**
   - Cut in favor of comprehensive article-level and revision-level comments. The core brief listed passage comments as an optional stretch idea; perfecting the 10 core goals takes priority.
2. **Visual Diff Between Revisions:**
   - Rather than integrating a heavy graphical diffing canvas, revision history displays previous versus working text clearly.
3. **Multi-Role User Accounts (e.g., Editor AND Writer simultaneously):**
   - The brief specifies `EDITOR` and `WRITER` as distinct roles. Editors already hold full article creation and editing privileges across sections, keeping the permission matrix simple and auditable.
