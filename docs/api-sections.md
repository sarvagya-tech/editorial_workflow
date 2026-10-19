# Section & Assignment Management API Specification

This document details the Section Management and Writer Assignment endpoints implemented for **Phase 3** of the Editorial Workflow Management System (*The Dispatch*).

---

## 1. Authentication & Role Permissions

All endpoints require a valid JWT Bearer token in the `Authorization` header:
`Authorization: Bearer <token>`

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `POST` | `/api/sections` | `EDITOR` | Create a new editorial section/desk |
| `GET` | `/api/sections` | `EDITOR`, `WRITER` | List sections (scoped by role & assignment) |
| `GET` | `/api/sections/:id` | `EDITOR`, `WRITER` | Retrieve section details (scoped) |
| `PATCH` | `/api/sections/:id` | `EDITOR` | Update section name, description, or owner |
| `PATCH` | `/api/sections/:id/archive` | `EDITOR` | Soft-archive section (preserves data, prevents new articles/assignments) |
| `PATCH` | `/api/sections/:id/restore` | `EDITOR` | Restore an archived section to active status |
| `GET` | `/api/sections/:id/assignments` | `EDITOR`, `WRITER` | View writer assignments (scoped) |
| `POST` | `/api/sections/:id/assignments` | `EDITOR` | Assign a writer to a section |
| `DELETE` | `/api/sections/:id/assignments/:writerId` | `EDITOR` | Remove a writer from a section |

---

## 2. Policy & Design Decisions

### Non-Disclosure Policy for Writers
To prevent unauthorized users from enumerating confidential editorial sections or confirming the existence of desks by guessing CUID identifiers, a writer requesting an unassigned section (`GET /api/sections/:id`) receives **`404 Not Found`** rather than a `403 Forbidden`.

### Writer Assignment Privacy
When querying `/api/sections/:id/assignments`:
- **Editors** receive the full roster of assigned writers with assigned timestamp and assigner metadata.
- **Writers** receive only their own assignment record for that section. They cannot enumerate other assigned staff.

### Archive & Restore Invariants
- **Data Preservation:** Archiving a section does **not** delete any articles, historical revisions, comments, timeline events, or assignments.
- **Assignment State during Archive:** Existing writer assignments remain preserved as historical records. However, new assignments are blocked (`400 Bad Request`) while archived.
- **Article Creation Block:** Writers and editors are blocked from creating new articles in an archived section.
- **Idempotency:** Repeated archive requests on an already archived section (or repeated restore requests on an active section) safely return `200 OK` with the current state.

### Name Conflict Policy
Section names are case-insensitively unique. Attempting to create or rename a section to an existing name returns **`409 Conflict`**.

---

## 3. Endpoints Specification

### 3.1 Create Section
`POST /api/sections` (Role: `EDITOR`)

#### Request Body
```json
{
  "name": "Artificial Intelligence & Ethics",
  "description": "Coverage of generative models, algorithmic governance, and societal impacts.",
  "ownerEditorId": "cly_editor_001"
}
```

#### Responses
- **`201 Created`**:
```json
{
  "success": true,
  "data": {
    "id": "cm2...",
    "name": "Artificial Intelligence & Ethics",
    "description": "Coverage of generative models, algorithmic governance, and societal impacts.",
    "isArchived": false,
    "ownerEditorId": "cly_editor_001",
    "createdAt": "2026-10-19T18:30:00.000Z",
    "updatedAt": "2026-10-19T18:30:00.000Z",
    "ownerEditor": {
      "id": "cly_editor_001",
      "name": "Sarah Jenkins",
      "email": "editor@dispatch.com",
      "role": "EDITOR"
    }
  }
}
```
- **`400 Bad Request`**: Validation error (e.g. missing name, or `ownerEditorId` belongs to a non-editor user).
- **`403 Forbidden`**: User has role `WRITER`.
- **`409 Conflict`**: Section name already exists.

---

### 3.2 List Sections
`GET /api/sections` (Role: `EDITOR`, `WRITER`)

#### Query Parameters
- `isArchived` (Optional, string): Filter by archival state:
  - `false` (default): Active sections only.
  - `true`: Archived sections only.
  - `all`: Both active and archived (Editors only).
- `page` (Optional, integer, default: 1)
- `limit` (Optional, integer, default: 50)

#### Behavior by Role
- **Editors:** See all sections across the organization matching the archive filter, with writer assignment counts and article counts.
- **Writers:** See **only active sections they are explicitly assigned to**. Archived sections are strictly excluded from their working list.

#### Response Example
```json
{
  "success": true,
  "data": [
    {
      "id": "cm2...",
      "name": "Technology & Science",
      "description": "Tech news, enterprise software, and consumer electronics.",
      "isArchived": false,
      "ownerEditorId": "cly_editor_001",
      "ownerEditor": {
        "id": "cly_editor_001",
        "name": "Sarah Jenkins",
        "email": "editor@dispatch.com"
      },
      "_count": {
        "assignments": 3,
        "articles": 8
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### 3.3 Get Section Details
`GET /api/sections/:id` (Role: `EDITOR`, `WRITER`)

#### Behavior by Role
- **Editors:** Can view any section.
- **Writers:** Can view only sections assigned to them. Requesting an unassigned section returns `404 Not Found`.

#### Response Example
```json
{
  "success": true,
  "data": {
    "id": "cm2...",
    "name": "Technology & Science",
    "description": "Tech news...",
    "isArchived": false,
    "ownerEditorId": "cly_editor_001",
    "ownerEditor": {
      "id": "cly_editor_001",
      "name": "Sarah Jenkins",
      "email": "editor@dispatch.com"
    },
    "assignments": [
      {
        "id": "cma_01",
        "writerId": "cly_writer_001",
        "createdAt": "2026-10-19T18:00:00.000Z",
        "writer": {
          "id": "cly_writer_001",
          "name": "Maya Patel",
          "email": "writer@dispatch.com"
        }
      }
    ],
    "_count": {
      "articles": 8
    }
  }
}
```

---

### 3.4 Update Section
`PATCH /api/sections/:id` (Role: `EDITOR`)

#### Request Body
```json
{
  "name": "Technology, AI & Media",
  "description": "Expanded desk scope.",
  "ownerEditorId": "cly_editor_002"
}
```

#### Invariants
- Only provided fields are updated.
- If `ownerEditorId` is provided, server verifies user exists and has role `EDITOR`.
- System fields (`id`, `createdAt`, `updatedAt`, `isArchived`) cannot be overwritten through this route.

---

### 3.5 Archive Section
`PATCH /api/sections/:id/archive` (Role: `EDITOR`)

Marks section as `isArchived = true`. Idempotent.

#### Response Example
```json
{
  "success": true,
  "message": "Section archived successfully",
  "data": {
    "id": "cm2...",
    "name": "Technology & Science",
    "isArchived": true
  }
}
```

---

### 3.6 Restore Section
`PATCH /api/sections/:id/restore` (Role: `EDITOR`)

Marks section as `isArchived = false`. Preserves all prior assignments and article linkages. Idempotent.

#### Response Example
```json
{
  "success": true,
  "message": "Section restored successfully",
  "data": {
    "id": "cm2...",
    "name": "Technology & Science",
    "isArchived": false
  }
}
```

---

### 3.7 List Section Assignments
`GET /api/sections/:id/assignments` (Role: `EDITOR`, `WRITER`)

- **Editors:** Returns full assignment list.
- **Writers:** Returns only their own assignment record.

#### Response Example
```json
{
  "success": true,
  "data": [
    {
      "id": "cma_01",
      "sectionId": "cm2...",
      "writerId": "cly_writer_001",
      "assignedById": "cly_editor_001",
      "createdAt": "2026-10-19T18:00:00.000Z",
      "writer": {
        "id": "cly_writer_001",
        "name": "Maya Patel",
        "email": "writer@dispatch.com"
      },
      "assignedBy": {
        "id": "cly_editor_001",
        "name": "Sarah Jenkins",
        "email": "editor@dispatch.com"
      }
    }
  ]
}
```

---

### 3.8 Assign Writer
`POST /api/sections/:id/assignments` (Role: `EDITOR`)

#### Request Body
```json
{
  "writerId": "cly_writer_002"
}
```

#### Validation & Constraints
- Verifies section exists and is **not archived** (`400 Bad Request` if archived).
- Verifies target user exists and has role `WRITER` (`400 Bad Request` if non-writer).
- Rejects duplicate assignments gracefully (`409 Conflict`).
- Concurrently safe: Database `UNIQUE(section_id, writer_id)` constraint catches parallel race attempts.

---

### 3.9 Remove Writer Assignment
`DELETE /api/sections/:id/assignments/:writerId` (Role: `EDITOR`)

#### Safety & Non-Destruction
- Deleting an assignment only severs future article creation permissions for that desk.
- **Articles written by the writer in that section are never deleted.**
- Revision history and timeline audit logs are preserved intact.
- Section owner is unaffected.
