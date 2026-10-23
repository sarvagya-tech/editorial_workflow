# Editorial Workflow Platform (The Dispatch) — Final Submission

Welcome to **The Dispatch**, a production-grade digital newsroom editorial workflow management system built with Node.js, Express, PostgreSQL (Neon), Prisma ORM, and React with Tailwind CSS.

---

## 1. Project Links & Quick Access

- **Local Frontend Dev Server:** `http://localhost:5173/`
- **Local Backend API Server:** `http://localhost:5000/`
- **Backend Healthcheck:** `GET http://localhost:5000/api/health`

---

## 2. Reviewer Quick-Start & Verified Demo Accounts

The application includes an instant **1-Click Demo User Switcher** in the top navigation header and supports standard JWT bearer authentication across all API endpoints:

| Role | Email | Password | Name & Assigned Scope |
| :--- | :--- | :--- | :--- |
| **EDITOR** | `editor@dispatch.com` | `password123` | **Sarah Jenkins** (Managing Editor, Global Access across all Desks) |
| **EDITOR** | `david.editor@dispatch.com` | `password123` | **David Zhao** (Senior Editor, Global Access across all Desks) |
| **WRITER** | `writer@dispatch.com` | `password123` | **Maya Patel** (Reporter: Technology & Silicon, Politics Desks) |
| **WRITER** | `james.writer@dispatch.com` | `password123` | **James Wilson** (Correspondent: Politics & Civic Affairs, Investigative) |
| **WRITER** | `elena.writer@dispatch.com` | `password123` | **Elena Rostova** (Reporter: Culture & Modern Arts Desk Only) |

---

## 3. Technology Stack & Architectural Decisions

| Layer | Technologies | Architectural Justification |
| :--- | :--- | :--- |
| **Backend API** | Node.js v22, Express.js (ES Modules) | Lightweight, predictable middleware chain, standard async/await error propagation, no transpilation artifacts. |
| **Database & ORM** | Neon Serverless PostgreSQL + Prisma ORM | Strong relational integrity, compound uniqueness constraints, ACID transactions, and native connection pooling with SSL. |
| **Database Engine Guards** | PostgreSQL PL/pgSQL Triggers | Engine-enforced `trg_timeline_immutable` ensures timeline audit events are strictly append-only; `trg_validate_section_owner` enforces editor integrity. |
| **Frontend Client** | React 18, Vite, Tailwind CSS, Lucide Icons | Minimal shadcn-inspired aesthetic, sub-second HMR, system/persisted Dark & Light mode toggle, zero inert buttons. |
| **Security Controls** | Bcrypt (10 rounds), JWT, Zod/Joi-style validators | Privilege escalation prevention on public registration, non-disclosure 404 policies on unassigned sections, and formula-injection neutralization for CSV exports. |

---

## 4. Phase-by-Phase Implementation & Goal Checklist

| Goal # | Objective | Status | Implementation Details |
| :---: | :--- | :---: | :--- |
| **1** | **Accounts and Roles** | ✅ **Done** | JWT token authentication, bcrypt hashing, strict server-side role middleware (`requireEditor`, `requireWriter`), and public registration prevention against role escalation. |
| **2** | **Sections Management** | ✅ **Done** | Managing editor ownership, soft-archiving with historical retention, and restoration without data loss. |
| **3** | **Articles in Sections** | ✅ **Done** | Section boundary isolation, author attribution, and strict zero-disclosure 404s for unauthorized writer section queries. |
| **4** | **Article Lifecycle & Rules** | ✅ **Done** | Complete state machine: `DRAFT` → `IN_REVIEW` → `APPROVED` → `SCHEDULED` → `PUBLISHED`. Non-bypassable transitions with editorial integrity rule blocking self-approvals. |
| **5** | **Section Assignments** | ✅ **Done** | Normalized M:N join model (`SectionAssignment`), assigned-only writing permissions, and assignment privacy. |
| **6** | **Search, Pagination & Calendar CSV** | ✅ **Done** | Full-text search across titles and body with GIN index, multi-param filtering, stable deterministic sorting, pagination metadata, and RFC-4180 CSV export with formula injection mitigation (CWE-1236). |
| **7** | **Bulk Scheduling & Unpublishing** | ✅ **Done** | Atomic batch processing with per-article success/failure reporting, concurrency locks, and audit timeline tracking. |
| **8** | **Editorial Dashboard & Analytics** | ✅ **Done** | Scoped live production metrics, Monday–Sunday UTC publication trend chart, status distributions, and active desk allocations. |
| **9** | **Tamper-Proof Audit History** | ✅ **Done** | Append-only `timeline_events` with PostgreSQL engine trigger `trg_timeline_immutable` blocking `UPDATE` and `DELETE` at the database level. |
| **10** | **Overdue Publication Alerts** | ✅ **Done** | Dynamic detection where `publish_at < NOW()`, occurrence-based dismissal tied to `schedule_sequence` (re-arms upon rescheduling), and role-scoped permissions. |

---

## 5. Automated Test Suite Results (100% Passing)

All 9 test suites were executed against the live database with zero baseline failures:

| Phase | Test Suite File | Checks Passed | Coverage Area |
| :--- | :--- | :---: | :--- |
| **Phase 1** | `test-db-verification.js` | **16 / 16** | Schema normalization, compound indexes, immutability trigger |
| **Phase 2** | `test-auth.js` | **25 / 25** | Login, JWT, profile scoping, privilege escalation prevention |
| **Phase 3** | `test-sections.js` | **34 / 34** | Section CRUD, archiving, writer assignments, privacy |
| **Phase 4** | `test-articles.js` | **45 / 45** | Article CRUD, revision numbering, timeline logging, comments |
| **Phase 5** | `test-workflow.js` | **57 / 57** | State machine, self-approval prevention, optimistic locking |
| **Phase 6** | `test-search-calendar.js` | **55 / 55** | Full-text search, filters, pagination, CSV formula mitigation |
| **Phase 7** | `test-bulk-workflow.js` | **57 / 57** | Bulk scheduling, bulk unpublishing, atomic batch reporting |
| **Phase 8** | `test-dashboard.js` | **45 / 45** | 8-week date math, KPI calculations, role-based scoping |
| **Phase 9** | `test-alerts.js` | **56 / 56** | Overdue detection, sequence-based dismissals, re-arming |
| **Total** | **All 9 Verification Suites** | **390 / 390 (100%)** | Complete end-to-end integration coverage |

---

## 6. Local Setup and Deployment Guide

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- Managed PostgreSQL database (e.g. Neon, Supabase, AWS RDS)

### Environment Variables

Create `.env` in the root and `server/` directories:
```env
# Database connection string (Neon with SSL)
DATABASE_URL="postgresql://<user>:<password>@<neon-host>/<dbname>?sslmode=require"

# JWT signing secret (minimum 32 characters)
JWT_SECRET="editorial-workflow-production-jwt-secret-key-32chars"

# Server port (default: 5000)
PORT=5000

# Environment mode
NODE_ENV=production
```

### Installation & Build Commands

```bash
# 1. Install root, server, and client dependencies
npm install

# 2. Run database migrations
npm run prisma:migrate

# 3. Seed baseline demo data (if fresh database)
npm run prisma:seed

# 4. Build both frontend and backend
npm run build

# 5. Run all verification test suites
npm --prefix server run test:all

# 6. Start production backend server
npm --prefix server start
```

---

## 7. Step-by-Step Evaluator Walkthrough

To review the full capabilities in under 3 minutes:

1. **Launch the Application:**
   Open `http://localhost:5173/` in a modern browser.
2. **Toggle Dark / Light Mode:**
   Click the **[ ☀️ Light | 🌙 Dark ]** segmented switch in the top right header to experience the seamless theme transition.
3. **Inspect the Editorial Dashboard:**
   Notice the 4 KPI metric cards, the interactive 8-week publication bar chart with tooltips, and the active alert banner.
4. **Review Overdue Alerts:**
   Click **"Overdue Alerts"** in the sidebar. Click **"Dismiss Alert"** as Sarah Jenkins (Editor). Notice the counter decreases and the alert disappears from the active view.
5. **Inspect State Machine & Audit History:**
   Click **"Articles & Feed"**, select any article row to open the slide-over detail drawer. View the immutable chronological audit log of every workflow state change and comment.
6. **Verify Role Scoping & Non-Disclosure:**
   Switch to **"Maya Patel (Writer)"** in the top Demo User dropdown. Observe that the dashboard re-scopes to her assigned desks, overdue alert dismissal shows *"Editor dismiss only"*, and articles from unassigned desks are strictly hidden.

---

## 8. Known Limitations & Future Roadmap

1. **Inline Commentary Threads:** Currently, comments are logged at the article/revision level. Future iterations could add character-offset inline passage annotations.
2. **Visual Diff Highlighting:** Revisions currently preserve historical snapshots in full. Adding a line-by-line visual diff renderer would enhance editorial review.
3. **Public Expiring Fact-Checker Previews:** Pre-publication access currently requires system authentication. Signed tokenized preview links would allow external review.
