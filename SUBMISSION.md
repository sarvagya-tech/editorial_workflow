# Submission

Fill this in and commit it. This is the first file we open.

## Links

- **GitHub repository:** <public repo URL>
- **Live application:** <deployed URL>

## Notes for the reviewer

The database is built on PostgreSQL with strict engine-level triggers for append-only audit permanence and full-text search indexing. When reviewing, you can use the 1-click demo switcher or sign in with any of the demo credentials below.

## Demo credentials

| Role | Email | Password | Name & Desk |
|------|-------|----------|-------------|
| Editor | `editor@dispatch.com` | `password123` | Sarah Jenkins (Managing Editor, Technology Desk) |
| Editor | `david.editor@dispatch.com` | `password123` | David Zhao (Senior Editor, Politics Desk) |
| Writer | `writer@dispatch.com` | `password123` | Maya Patel (Tech & Politics Reporter) |
| Writer | `james.writer@dispatch.com` | `password123` | James Wilson (Civic & Investigative Correspondent) |
| Writer | `elena.writer@dispatch.com` | `password123` | Elena Rostova (Culture & Arts Critic) |

## Stack

| Layer | What you used | Why |
|-------|---------------|-----|
| Frontend | React 18 (Vite, Tailwind CSS, Lucide Icons) | Lightning-fast HMR, clean editorial typography, and zero-runtime CSS overhead. |
| Backend | Node.js (Express, JavaScript ES Modules) | Clear middleware-based architecture, robust async request handling, and no transpilation overhead. |
| Database | PostgreSQL (Neon) with Prisma ORM | Strong referential integrity, native GIN full-text search, PL/pgSQL audit triggers, and declarative schema migrations. |
| Hosting | Vercel (Client) + Render/Serverless (Backend) + Neon (DB) | High availability, connection pooling, SSL encryption, and reliable free-tier hosting. |

## Goal checklist

Mark each honestly. Partial is fine — say what is partial.

| # | Goal | Status | Notes |
|---|------|--------|-------|
| 1 | Accounts and roles | Done | Role-based authorization (`EDITOR`, `WRITER`) enforced server-side. |
| 2 | Sections | Done | Managing editor ownership, soft-archiving with historical retention. |
| 3 | Articles inside sections | Done | Section isolation, role scoping, and author attribution. |
| 4 | Article lifecycle with rules | Done | `Draft` → `In Review` → `Approved` → `Scheduled` → `Published`. Self-approval block enforced. Revisions for published content. |
| 5 | Section assignments | Done | Explicit M:N join model; writers only author in assigned sections. |
| 6 | Finding articles | Done | Server-side text search over title/body with PostgreSQL GIN index, filters, sorting, and pagination. |
| 7 | Acting on many articles at once | Done | Bulk schedule and unpublish with per-article success/failure reporting; calendar CSV export. |
| 8 | A dashboard | Done | Headline numbers, status/section breakdowns, and 8-week published trend chart. |
| 9 | History you cannot rewrite | Done | Append-only `timeline_events` enforced via PostgreSQL engine trigger `trg_timeline_immutable`. |
| 10 | Overdue publish alerts | Done | Identified via `publish_at < NOW()`; dismissals tied to discrete `schedule_sequence` so alerts resurface upon rescheduling. |

## How much time did you actually spend?

~4 hours on architectural design, normalized schema modeling, PostgreSQL triggers, verification tests, and project documentation.

## What would you do next, with another 12 hours?

1. Implement passage-level inline commentary threads with character offset markers.
2. Add visual side-by-side diffing between revisions.
3. Add signed, expiring public preview URLs for external fact-checkers prior to publication.

## What are you least happy with in this codebase, and why?

While storing denormalized active `title` and `body` directly on `articles` speeds up 95% of queries, it requires disciplined synchronization inside the `publishRevision` transaction to ensure the live article always matches its canonical published revision.
