# The Dispatch — Digital Newsroom Editorial Workflow Platform

[![Node.js](https://img.shields.io/badge/Node.js-v20+-68A063?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-v4.21-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-v18.3-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-v5.4-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_Serverless-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://neon.tech/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-v5.22-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Tests Passing](https://img.shields.io/badge/Test_Suite-444%2F444_Passed_(100%25)-emerald?style=flat-square&logo=checkmarx&logoColor=white)](file:///server/tests)

**The Dispatch** is a production-grade editorial workflow management platform engineered for modern digital newsrooms. It enforces strict editorial separation of concerns, multi-desk permissions, tamper-proof audit trails, and autonomous background scheduled publishing.

---

## ⚡ Quick Links & Live Deployments

- **Frontend Application (Vercel):** [Deploy on Vercel](https://vercel.com/) (Live client with dark/light themes & 1-click persona switcher)
- **Backend API Server (Render):** [Deploy on Render](https://render.com/) (`healthcheck: /api/health`)
- **Database:** Neon Serverless PostgreSQL with SSL pooling
- **Architecture Documentation:** [`docs/architecture.md`](docs/architecture.md)
- **Data Schema & Engine Guards:** [`docs/schema.md`](docs/schema.md)
- **Engineering Decisions Log:** [`docs/decisions.md`](docs/decisions.md)
- **Session Log & Implementation Plan:** [`docs/plan.md`](docs/plan.md)

---

## 👥 Verified Newsroom Demo Accounts

The application features a built-in **1-Click Staff Persona Switcher** in the navigation header. You can also sign in manually using any of the seeded credentials below:

| Role | Email | Password | Staff Member & Newsroom Desk | Scope & Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **EDITOR** | `editor@dispatch.com` | `password123` | **Sarah Jenkins** (Managing Editor) | Full global authority across all desks, section creation/archival, writer desk assignments, cross-author approvals, and system telemetry. |
| **EDITOR** | `david.editor@dispatch.com` | `password123` | **David Zhao** (Senior Editor) | Global editorial review across all desks, scheduling, and publication approvals. |
| **WRITER** | `writer@dispatch.com` | `password123` | **Maya Patel** (Tech Reporter) | Assigned strictly to **Technology** & **Politics** desks. Isolated from unassigned desks via zero-disclosure security policies. |
| **WRITER** | `james.writer@dispatch.com` | `password123` | **James Wilson** (Civic Affairs Reporter) | Assigned strictly to **Politics** & **Investigative** desks. |
| **WRITER** | `elena.writer@dispatch.com` | `password123` | **Elena Rostova** (Culture Reporter) | Assigned strictly to the **Culture** desk. |

---

## 🏗️ Core Engineering Highlights

### 1. Engine-Level Audit Immutability (`trg_timeline_immutable`)
Newsroom audit history cannot be rewritten—even by system administrators or ORM cascades. A native PostgreSQL PL/pgSQL trigger intercepts any `UPDATE` or `DELETE` executed against `timeline_events` and raises an engine exception (`SQLSTATE 'P0001'`).

```sql
CREATE OR REPLACE FUNCTION prevent_timeline_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Editorial Audit Violation: timeline_events records are strictly immutable and cannot be updated or deleted. (Event ID: %)', OLD.id;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_timeline_immutable
BEFORE UPDATE OR DELETE ON timeline_events
FOR EACH ROW
EXECUTE FUNCTION prevent_timeline_mutation();
```

### 2. Four-Eyes Editorial Governance & State Machine
Articles transition through an explicit state machine:
$$\text{Draft} \longrightarrow \text{In Review} \longrightarrow \text{Approved} \longrightarrow \text{Scheduled} \longrightarrow \text{Published}$$

- **Self-Approval Prevention:** Authors are strictly prohibited from approving their own stories on the backend (`author_id !== reviewer_id`), even if the author possesses the `EDITOR` role.
- **Published Content Lock:** Once an article is published, direct edits are blocked. Authors must fork an isolated **Revision Snapshot**, which follows its own review path before atomically superseding the canonical piece upon final approval.

### 3. Headless Autonomous Background Scheduled Publishing
Scheduled articles are published automatically without requiring user browser visits:
- **In-Process Worker Daemon:** Polls every 30 seconds (`scheduler.worker.js`), checking target publication times against the Neon PostgreSQL clock (`SELECT NOW()`) to eliminate clock drift.
- **Optimistic Concurrency Control:** Employs version locking (`article.version`) and atomic database transactions to eliminate race conditions and duplicate publishing.
- **External Webhook Trigger:** Exposes `POST /api/internal/cron/publish` secured with constant-time cryptographic validation (`x-cron-secret`) for external orchestrators (AWS EventBridge, Google Cloud Scheduler, Vercel Cron).

### 4. Zero-Disclosure Privacy & Security Policies
- **Endpoint Confidentiality:** Unassigned writers attempting to access restricted desk articles receive HTTP `404 Not Found` rather than `403 Forbidden`, eliminating enumeration attacks against embargoed investigations.
- **Spreadsheet Formula Injection Neutralization:** The RFC-4180 CSV calendar export sanitizes formula trigger characters (`=`, `+`, `-`, `@`, `\t`, `\r`) to protect newsroom staff from spreadsheet code execution (CWE-1236).

---

## 📊 System Architecture

```
┌────────────────────────────────────────────────────────┐
│               Frontend Client (Vercel)                 │
│      React 18 + Vite + Tailwind CSS + Lucide Icons     │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS / JWT Auth
                            ▼
┌────────────────────────────────────────────────────────┐
│               Backend API Server (Render)              │
│       Node.js (ES Modules) + Express.js + Prisma       │
│                                                        │
│  ┌────────────────────────┐  ┌──────────────────────┐  │
│  │   REST API Gateways    │  │  Autonomous Worker   │  │
│  │ (Auth, Articles, Desks)│  │ (30s Polling Daemon) │  │
│  └───────────┬────────────┘  └──────────┬───────────┘  │
└──────────────┼──────────────────────────┼──────────────┘
               │                          │
               │ Prisma ORM (ACID Tx)     │ SELECT NOW()
               ▼                          ▼
┌────────────────────────────────────────────────────────┐
│           Neon Serverless PostgreSQL Database          │
│                                                        │
│  • Engine Triggers: trg_timeline_immutable             │
│  • Compound Indexes: GIN full-text search              │
│  • Optimistic Version Locks & Schedule Sequences       │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Key Newsroom Features

- **Editorial Command Dashboard:** Live production KPIs, status breakdowns, desk distributions, and an interactive 8-week publication trend chart.
- **Editorial Release Calendar:** Interactive visual calendar with desk filtering and one-click RFC-4180 CSV export.
- **Overdue Publication Alerts:** Dynamic detection where `publish_at < NOW()`. Features generation sequence tracking (`schedule_sequence`) ensuring alerts reliably re-arm if an overdue article is rescheduled.
- **Server-Side Search & Filtering:** High-speed full-text search across titles and bodies with author, section, status filters, and server-side pagination.
- **Atomic Bulk Operations:** Batch schedule and unpublish multiple articles at once with per-item success/failure reporting.
- **System Health & Worker Telemetry:** Minimalist diagnostics modal for editors displaying autonomous worker uptime, Neon DB clock synchronization, and manual test tick execution.

---

## 🛠️ Local Development Setup

### Prerequisites
- **Node.js:** v18.0.0 or higher
- **npm:** v9.0.0 or higher
- **PostgreSQL Database:** Neon Serverless PostgreSQL or local Postgres

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/sarvagya-tech/editorial_workflow.git
cd editorial_workflow
npm install
```

### 2. Configure Environment Variables
Create `.env` in the `server/` directory:
```env
DATABASE_URL="postgresql://<user>:<password>@<host>/<database>?sslmode=require"
JWT_SECRET="editorial-workflow-jwt-secret-key-32-chars-long"
PORT=5000
CRON_SECRET="dispatch-internal-cron-secret-2026"
ENABLE_SCHEDULER_WORKER="true"
SCHEDULER_INTERVAL_MS="30000"
NODE_ENV="development"
```

### 3. Initialize Database & Seed Demo Data
```bash
# Push database schema to PostgreSQL
npm --prefix server run prisma:generate
npx prisma db push --schema=server/prisma/schema.prisma

# Seed 5 production news stories, reporting desks, and demo staff accounts
node server/prisma/seed.js
```

### 4. Run Development Servers
```bash
# Runs backend on http://localhost:5000 and frontend on http://localhost:5173
npm run dev
```

---

## 🧪 Automated Test Suite (100% Passing)

The platform includes **10 comprehensive end-to-end integration test suites** covering all 444 verification checks:

```bash
npm --prefix server run test:all
```

| Suite | File | Checks Passed | Coverage Area |
| :--- | :--- | :---: | :--- |
| **Phase 1** | `server/tests/test-db-verification.js` | **16 / 16** | Schema normalization, compound indexes, immutability trigger |
| **Phase 2** | `server/tests/test-auth.js` | **25 / 25** | Login, JWT, profile scoping, privilege escalation prevention |
| **Phase 3** | `server/tests/test-sections.js` | **34 / 34** | Section CRUD, soft-archiving, writer desk assignments |
| **Phase 4** | `server/tests/test-articles.js` | **45 / 45** | Article CRUD, sequential revisions, comments, audit logs |
| **Phase 5** | `server/tests/test-workflow.js` | **57 / 57** | State machine, self-approval prevention, optimistic locking |
| **Phase 6** | `server/tests/test-search-calendar.js` | **55 / 55** | Full-text search, filters, pagination, CSV formula injection |
| **Phase 7** | `server/tests/test-bulk-workflow.js` | **57 / 57** | Bulk scheduling, bulk unpublishing, atomic batch reporting |
| **Phase 8** | `server/tests/test-dashboard.js` | **45 / 45** | 8-week publication trends, KPI metrics, role-based scoping |
| **Phase 9** | `server/tests/test-alerts.js` | **56 / 56** | Overdue detection, sequence-based dismissals, re-arming |
| **Phase 10** | `server/tests/test-scheduled-publisher.js` | **54 / 54** | Autonomous publishing, DB clock sync, concurrency locks |
| **Total** | **All 10 Verification Suites** | **444 / 444 (100%)** | Complete end-to-end integration coverage |

---

## 📁 Repository Structure

```
editorial_workflow/
├── client/                     # Frontend SPA (React + Vite + Tailwind CSS)
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/         # Header, Sidebar, MobileMenu, CommandPalette
│   │   │   ├── modals/         # SystemHealthModal, ArticleDetailModal, CreateStoryModal
│   │   │   └── views/          # DashboardView, AlertsView, CalendarView, ArticlesView
│   │   ├── services/api.js     # API service layer with multi-environment routing
│   │   └── App.jsx             # Top-level application router & session controller
│   └── vercel.json             # Vercel SPA rewrite & deployment rules
├── server/                     # Backend API (Node.js + Express + Prisma)
│   ├── prisma/
│   │   ├── schema.prisma       # Relational schema with compound constraints
│   │   └── seed.js             # Idempotent digital newsroom seed script
│   ├── src/
│   │   ├── controllers/        # Request handlers (auth, articles, sections, cron)
│   │   ├── middleware/         # Auth verification, role guards, error handlers
│   │   ├── routes/             # Express route definitions
│   │   ├── services/           # Business logic & workflow state machine
│   │   └── workers/            # Autonomous scheduled publishing daemon
│   └── tests/                  # 10 integration test suites (444 assertions)
├── docs/                       # Technical architecture & design documentation
│   ├── architecture.md         # Full system architecture, request paths & boundaries
│   ├── schema.md               # Database tables, constraints & scalability analysis
│   ├── decisions.md            # Technical decisions log & architectural trade-offs
│   ├── plan.md                 # Implementation session breakdown & time logs
│   └── ai-prompts.md           # Engineering verification & prompt logs
├── render.yaml                 # Render Infrastructure-as-Code Blueprint
├── SUBMISSION.md               # Evaluator walkthrough & submission overview
└── package.json                # Monorepo workspace configuration
```

---

## 📄 License
MIT License. Developed for digital newsroom workflow orchestration.
