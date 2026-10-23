# Editorial Workflow State Machine API Specification

This document details the transactional, append-only workflow state machine engine implemented for **Phase 5** of the Editorial Workflow Management System (*The Dispatch*).

---

## 1. Authentication & Role Permissions

All workflow endpoints require a valid JWT Bearer token in the `Authorization` header:
`Authorization: Bearer <token>`

| Method | Endpoint | Allowed Roles | State Transition | Description |
|---|---|---|---|---|
| `POST` | `/api/articles/:id/submit` | `WRITER` (author), `EDITOR` | `DRAFT` $\to$ `IN_REVIEW` | Submit working revision for editorial review |
| `POST` | `/api/articles/:id/approve` | `EDITOR` (non-author) | `IN_REVIEW` $\to$ `APPROVED` | Approve reviewed revision. **Self-approval strictly forbidden.** |
| `POST` | `/api/articles/:id/schedule` | `EDITOR` | `APPROVED` $\to$ `SCHEDULED` | Schedule publication for a future ISO timestamp |
| `POST` | `/api/articles/:id/publish` | `EDITOR` | `APPROVED` or due `SCHEDULED` $\to$ `PUBLISHED` | Publish approved revision live. Promotes content atomically. |
| `POST` | `/api/articles/:id/unpublish` | `EDITOR` | `SCHEDULED` or `PUBLISHED` $\to$ `APPROVED` | Unpublish piece back to Approved status. Preserves history. |

---

## 2. Permitted State Transitions & State Matrix

```
                    ┌───────────────────────────┐
                    │           DRAFT           │
                    └─────────────┬─────────────┘
                                  │ (Submit)
                                  ▼
                    ┌───────────────────────────┐
                    │         IN_REVIEW         │
                    └─────────────┬─────────────┘
                                  │ (Approve: Editor != Author)
                                  ▼
        ┌───────────────────────────────────────────────────┐
        │                     APPROVED                      │
        └───┬───────────────────────────┬───────────────▲───┘
            │ (Schedule)                │ (Publish      │
            ▼                           │  Immediately) │
┌───────────────────────┐               │               │
│       SCHEDULED       │               │               │ (Unpublish)
└───────────┬───────────┘               │               │
            │ (Publish after time)      ▼               │
            └───────────────────► ┌───────────┐         │
                                  │ PUBLISHED ├─────────┘
                                  └───────────┘
```

### Invalid Transitions (Rejected with `400 Bad Request` or `409 Conflict`)
- `DRAFT` $\to$ `APPROVED` (Cannot bypass editorial review)
- `DRAFT` $\to$ `PUBLISHED` (Cannot bypass review and approval)
- `IN_REVIEW` $\to$ `SCHEDULED` (Cannot schedule unapproved articles)
- `IN_REVIEW` $\to$ `PUBLISHED` (Cannot publish unapproved articles)
- `SCHEDULED` $\to$ `PUBLISHED` before `publishAt` (Cannot publish scheduled pieces early)

---

## 3. Core Workflow Policies

### 3.1 Self-Approval Prohibition (Separation of Editorial Concerns)
An editor who authors an article or authoring a working revision **cannot approve their own work**:
`article.authorId === user.id || workingRevision.authorId === user.id` $\implies$ **`403 Forbidden`**.
Approval must come from an independent newsroom editor.

### 3.2 Dual-Layer Revision Model for Published Articles
When an article is already `PUBLISHED`:
1. The currently published revision snapshot remains live and untouched (`publishedRevisionId` remains fixed).
2. The author or editor opens a replacement revision (`POST /api/articles/:id/revisions`), creating Revision #N with `status: 'DRAFT'`.
3. Revision #N progresses through its own lifecycle (`DRAFT` $\to$ `IN_REVIEW` $\to$ `APPROVED`).
4. Throughout this review process, `articles.status` remains `PUBLISHED`, and reader queries see the canonical published snapshot.
5. Only when Revision #N reaches `publish` does `articles.publishedRevisionId` atomically shift to Revision #N, and active `title`/`body` update.
6. The old revision snapshot remains permanently accessible in the historical revision roster.

### 3.3 Optimistic Concurrency Control
Every article record includes a monotonic `version` integer. All state transition updates execute:
```sql
UPDATE articles SET status = $newStatus, version = version + 1
WHERE id = $articleId AND version = $currentVersion;
```
If a concurrent request modifies the article, the version condition fails, throwing `409 Conflict` (`P2025` RecordNotFound).

### 3.4 Append-Only Audit Ledger
Every state transition records an entry in `timeline_events` within the same database transaction.
The PostgreSQL engine trigger `trg_timeline_immutable` raises an exception if any database update or deletion is attempted on `timeline_events`.

---

## 4. Endpoints Specification

### 4.1 Submit for Review
`POST /api/articles/:id/submit`

#### Request Body
```json
{
  "revisionId": "optional_revision_id"
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "message": "Article successfully submitted for editorial review.",
  "data": {
    "id": "cm2_art_101",
    "status": "IN_REVIEW",
    "workingRevision": {
      "revisionNumber": 1,
      "status": "IN_REVIEW"
    }
  }
}
```

---

### 4.2 Approve Article
`POST /api/articles/:id/approve`

#### Response (`200 OK`)
```json
{
  "success": true,
  "message": "Article successfully approved for publication.",
  "data": {
    "id": "cm2_art_101",
    "status": "APPROVED",
    "workingRevision": {
      "revisionNumber": 1,
      "status": "APPROVED"
    }
  }
}
```

#### Self-Approval Rejection (`403 Forbidden`)
```json
{
  "success": false,
  "message": "Editorial Integrity Violation: Editors cannot approve their own articles."
}
```

---

### 4.3 Schedule Publication
`POST /api/articles/:id/schedule`

#### Request Body
```json
{
  "scheduledAt": "2026-11-01T09:00:00.000Z"
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "message": "Article publication scheduled successfully.",
  "data": {
    "id": "cm2_art_101",
    "status": "SCHEDULED",
    "publishAt": "2026-11-01T09:00:00.000Z",
    "scheduleSequence": 1
  }
}
```

---

### 4.4 Publish Article
`POST /api/articles/:id/publish`

#### Response (`200 OK`)
```json
{
  "success": true,
  "message": "Article published live successfully.",
  "data": {
    "id": "cm2_art_101",
    "status": "PUBLISHED",
    "publishedAt": "2026-10-23T10:00:00.000Z",
    "publishedRevision": {
      "id": "cm2_rev_001",
      "revisionNumber": 1
    }
  }
}
```

---

### 4.5 Unpublish Article
`POST /api/articles/:id/unpublish`

#### Request Body
```json
{
  "reason": "Retracted for fact-checking regarding secondary sources."
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "message": "Article unpublished and returned to Approved status.",
  "data": {
    "id": "cm2_art_101",
    "status": "APPROVED",
    "publishAt": null
  }
}
```
