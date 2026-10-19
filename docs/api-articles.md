# Article CRUD & Revision Management API Specification

This document details the Article CRUD, Revision Snapshots, Editorial Comments, and Audit Timeline endpoints implemented for **Phase 4** of the Editorial Workflow Management System (*The Dispatch*).

---

## 1. Authentication & Role Permissions

All endpoints require a valid JWT Bearer token in the `Authorization` header:
`Authorization: Bearer <token>`

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `POST` | `/api/articles` | `WRITER`, `EDITOR` | Create an article with initial Revision #1 in `DRAFT` status |
| `GET` | `/api/articles` | `WRITER`, `EDITOR` | List articles (filtered server-side; scoped to author/assigned sections for writers) |
| `GET` | `/api/articles/:id` | `WRITER`, `EDITOR` | Retrieve article details with working revision and published revision distinguished |
| `PATCH` | `/api/articles/:id` | `WRITER`, `EDITOR` | Update working draft content (title/body). Rejects direct edits to published articles |
| `DELETE` | `/api/articles/:id` | None | **Rejected with 405 Method Not Allowed.** Articles represent permanent editorial records |
| `GET` | `/api/articles/:id/revisions` | `WRITER`, `EDITOR` | List all historical revision snapshots for the article |
| `GET` | `/api/articles/:id/revisions/:revId` | `WRITER`, `EDITOR` | Retrieve a specific revision snapshot |
| `POST` | `/api/articles/:id/revisions` | `WRITER`, `EDITOR` | Open a new revision snapshot (without mutating live published content) |
| `GET` | `/api/articles/:id/comments` | `WRITER`, `EDITOR` | Retrieve chronological editorial discussion comments |
| `POST` | `/api/articles/:id/comments` | `WRITER`, `EDITOR` | Add an editorial comment and record a `COMMENT_ADDED` audit event atomically |
| `GET` | `/api/articles/:id/timeline` | `WRITER`, `EDITOR` | Retrieve tamper-proof audit timeline events |

---

## 2. Core Policies & Data Invariants

### 1. Hybrid Revision Architecture
- **Active / Query Layer (`articles`):** `title` and `body` on `articles` store the currently active content to enable 95% of queries (search, section listings, feeds) without expensive joins.
- **Snapshot Layer (`article_revisions`):** Each revision stores immutable snapshots of `title` and `body` along with sequential `revisionNumber` and author metadata.
- **Published Pointer (`articles.publishedRevisionId`):** Points to the specific revision snapshot that is currently live. When a new revision is opened on a published piece, `publishedRevisionId` remains anchored to the live revision until Phase 5 publishes the new revision.
- **PostgreSQL Trigger Verification (`trg_verify_published_revision`):** Ensures that `publishedRevisionId` can only point to a revision record that belongs to that exact article.

### 2. Zero-Disclosure Policy
Writers requesting an article or sub-resource in an unassigned section receive **`404 Not Found`** rather than `403 Forbidden`, preventing malicious enumeration of internal or embargoed investigative pieces.

### 3. Server-Side Scoping
List queries (`GET /api/articles`) enforce permissions strictly at the database layer via PostgreSQL queries:
- **Writers:** Restricted to articles where `authorId = req.user.id` OR `sectionId IN (assignedActiveSections)`.
- **Editors:** Access all newsroom sections.

### 4. Direct Published Content Edit Block
Attempting to edit content on a `PUBLISHED` article via `PATCH /api/articles/:id` returns **`400 Bad Request`**. The author or editor must open a new revision draft via `POST /api/articles/:id/revisions`.

### 5. Workflow State Machine Integrity
Generic `PATCH /api/articles/:id` requests cannot alter `status`, `publishedRevisionId`, `version`, or `scheduleSequence`. Attempting to modify `APPROVED` or `SCHEDULED` content via generic update is blocked to prevent bypassing Phase 5's workflow engine.

### 6. Permanent Editorial Immutability
- Articles are never hard-deleted (`DELETE` returns `405 Method Not Allowed`).
- Timeline events are strictly append-only. Engine-level trigger `trg_timeline_immutable` raises an exception if any database update or delete is attempted on `timeline_events`.

---

## 3. Endpoints Specification

### 3.1 Create Article
`POST /api/articles`

#### Request Body
```json
{
  "title": "Quantum Computing Advances in Silicon Photonics",
  "body": "Recent cryogenic bench tests demonstrate 99.4% two-qubit gate fidelities on standard CMOS silicon processes...",
  "sectionId": "cm2_tech_section_id"
}
```

#### Response (`201 Created`)
```json
{
  "success": true,
  "data": {
    "id": "cm2_art_123",
    "title": "Quantum Computing Advances in Silicon Photonics",
    "body": "Recent cryogenic bench tests...",
    "status": "DRAFT",
    "sectionId": "cm2_tech_section_id",
    "authorId": "cly_writer_001",
    "version": 1,
    "section": {
      "id": "cm2_tech_section_id",
      "name": "Technology & Silicon",
      "isArchived": false
    },
    "author": {
      "id": "cly_writer_001",
      "name": "Maya Patel",
      "email": "writer@dispatch.com",
      "role": "WRITER"
    },
    "workingRevision": {
      "id": "cm2_rev_001",
      "revisionNumber": 1,
      "title": "Quantum Computing Advances in Silicon Photonics",
      "status": "DRAFT"
    },
    "publishedRevision": null
  }
}
```

---

### 3.2 List Articles
`GET /api/articles`

#### Query Parameters
- `page` (integer, default: 1)
- `limit` (integer, default: 20, max: 100)
- `sectionId` (string, optional)
- `authorId` (string, optional)
- `status` (`DRAFT`, `IN_REVIEW`, `APPROVED`, `SCHEDULED`, `PUBLISHED`, optional)

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "id": "cm2_art_123",
      "title": "Quantum Computing Advances...",
      "status": "DRAFT",
      "section": {
        "id": "cm2_tech_section_id",
        "name": "Technology & Silicon"
      },
      "author": {
        "name": "Maya Patel"
      },
      "workingRevision": {
        "revisionNumber": 1,
        "status": "DRAFT"
      },
      "publishedRevision": null,
      "_count": {
        "revisions": 1,
        "comments": 2,
        "timelineEvents": 3
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### 3.3 Get Article Details
`GET /api/articles/:id`

Returns complete metadata with `workingRevision` and `publishedRevision` distinguished.

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "id": "cm2_art_001",
    "title": "The Hidden Environmental Cost of Hyperscale AI Compute",
    "status": "PUBLISHED",
    "workingRevision": {
      "id": "cm2_rev_002",
      "revisionNumber": 2,
      "title": "The Hidden Environmental Cost of Hyperscale AI Compute (Updated with EPA Audit)",
      "status": "DRAFT"
    },
    "publishedRevision": {
      "id": "cm2_rev_001",
      "revisionNumber": 1,
      "title": "The Hidden Environmental Cost of Hyperscale AI Compute",
      "publishedAt": "2026-10-18T10:00:00.000Z"
    }
  }
}
```

---

### 3.4 Update Working Article Content
`PATCH /api/articles/:id`

#### Request Body
```json
{
  "title": "Updated Headline",
  "body": "Updated body text..."
}
```

---

### 3.5 Revision Snapshots
- `GET /api/articles/:id/revisions`: List revisions ordered `revisionNumber DESC`.
- `GET /api/articles/:id/revisions/:revisionId`: Snapshot details.
- `POST /api/articles/:id/revisions`: Open a new revision snapshot starting in `DRAFT` status.

---

### 3.6 Editorial Comments
- `GET /api/articles/:id/comments`: Chronological comments with author metadata.
- `POST /api/articles/:id/comments`:
```json
{
  "content": "Please verify quotes from the state regulator in paragraph 3.",
  "revisionId": "optional_revision_id"
}
```
Records `COMMENT_ADDED` event in `timeline_events` atomically.

---

### 3.7 Immutable Audit Timeline
`GET /api/articles/:id/timeline`

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "id": "cm2_event_001",
      "eventType": "CREATED",
      "oldStatus": null,
      "newStatus": "DRAFT",
      "description": "Article initiated by Maya Patel in Draft status",
      "actor": {
        "name": "Maya Patel",
        "role": "WRITER"
      },
      "createdAt": "2026-10-18T08:00:00.000Z"
    }
  ]
}
```
