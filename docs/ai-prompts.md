# AI Prompt Log & Verification Record

This log records the AI prompts used throughout the system design and implementation, the output generated, and the human engineering corrections made to ensure production quality.

---

## 1. Project Initialization & Stack Alignment

### Prompt
> "initialize the project i want to use the nodejs and express js , and react, tailwind css and lucide react and for database neon and prisma"

### What you got
The AI scaffolded a fullstack repository containing an Express server and a Vite React client. However, it defaulted to TypeScript (`.ts` / `.tsx` files, `tsconfig.json`) and immediately generated an entire pre-baked schema without consulting the architectural requirements.

### What you corrected
Corrected the AI to strictly use pure JavaScript (ES modules, `.js` and `.jsx`) without TypeScript compilation layers. Instructed the AI to clear the premature schema and design the database collaboratively following senior architectural principles.

---

## 2. Complete Database Architecture & Schema Design

### Prompt
> "Task: Design the Complete Database for an Editorial Workflow Management System... Act as a senior backend engineer and database architect... Analyze the complete requirements and produce a robust, normalized, implementation-ready PostgreSQL database design... Focus first on database architecture, schema design, relationships, constraints, workflow integrity, audit history, and documentation."

### What you got
A comprehensive, normalized PostgreSQL Prisma schema covering Users, Sections, SectionAssignments, Articles, ArticleRevisions, TimelineEvents, ArticleComments, and AlertDismissals, accompanied by engine-level triggers for audit immutability, full-text search indexing, and verification test scripts.

### What you corrected
- **Alert Reappearance on Reschedule (Goal 10 Edge Case):** The initial naive suggestion was a boolean `is_dismissed` on the article table. We replaced this with a discrete `schedule_sequence` generation integer and a dedicated `alert_dismissals` relation. This mathematically guarantees that if an article is rescheduled, the alert will reliably resurface when the new scheduled time passes.
- **Audit Immutability (Goal 9):** Recognized that Prisma schema alone cannot prevent an SQL `UPDATE` or `DELETE` on audit events. Added an explicit PostgreSQL PL/pgSQL trigger `trg_timeline_immutable` to guarantee append-only immutability at the database engine level.
- **Content Stability on Published Articles (Goal 4):** Clarified the distinction between live published content and working draft revisions, ensuring that opening a revision never overwrites the live text until the revision itself is published.
