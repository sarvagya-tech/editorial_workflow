# Article Discovery, Search, Pagination & Editorial Calendar API Specification

This document details the search, filtering, deterministic sorting, pagination, and editorial calendar CSV export capabilities implemented for **Phase 6** of the Editorial Workflow Management System (*The Dispatch*).

---

## 1. Authentication & Role Permissions

All endpoints require a valid JWT Bearer token:
`Authorization: Bearer <token>`

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `GET` | `/api/articles` | `WRITER`, `EDITOR` | Search, filter, sort, and paginate newsroom articles |
| `GET` | `/api/calendar/export.csv` | `WRITER`, `EDITOR` | Export scheduled and published articles as a sanitized CSV |
| `GET` | `/api/calendar/export` | `WRITER`, `EDITOR` | Alias for `/api/calendar/export.csv` |

---

## 2. Article Discovery & Search API

### `GET /api/articles`

Returns a paginated list of lean article discovery summaries matching server-side filters, search keywords, and role-based permissions. Complete article body content is intentionally omitted from listing projections to optimize bandwidth and maintain draft confidentiality.

#### Query Parameters

| Parameter | Type | Required | Default | Description / Allowed Values |
|---|---|---|---|---|
| `q` | String | No | None | Keyword query searched across `title` and `body` (case-insensitive substring match). |
| `sectionId` | String | No | None | Filter by section ID. |
| `status` | String | No | None | Filter by workflow status: `DRAFT`, `IN_REVIEW`, `APPROVED`, `SCHEDULED`, `PUBLISHED`. |
| `authorId` | String | No | None | Filter by article author ID. |
| `sortBy` | String | No | `updatedAt` | Allowlist: `updatedAt`, `createdAt`, `status`, `publishAt`, `scheduledAt`, `publishedAt`, `title`. |
| `order` | String | No | `desc` | Sort direction: `asc` or `desc` (case-insensitive). |
| `page` | Integer | No | `1` | One-based page number (must be $\ge 1$). |
| `limit` | Integer | No | `20` | Page size (must be an integer between `1` and `100`). |

#### Search & Index Strategy
- **Search Execution:** Search runs on the server using parameterized Prisma conditions (`title ILIKE $1 OR body ILIKE $1`).
- **PostgreSQL GIN Index:** Neon database leverages `idx_articles_fts` on `to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''))` alongside composite relational indexes `(section_id, status)` and `(author_id, status)`.
- **Partial Matching:** Partial words (e.g. `microgrid`, `cryo`) match occurrences in both headlines and full body copy.
- **SQL Wildcard & Metacharacter Safety:** Prisma parameterizes all search terms; special characters such as `%`, `_`, `'`, `"`, and brackets are evaluated safely without query corruption.
- **Empty Query Handling:** Queries consisting entirely of whitespace are sanitized and ignored, returning unconstrained permitted articles.

#### Deterministic Sorting & Pagination
- **Primary Sort:** Dynamically applied from the validated `sortBy` allowlist (`scheduledAt` automatically maps to `publishAt`).
- **Stable Tie-Breaking:** Every query appends secondary sorting on `{ id: 'desc' }` to guarantee stable ordering across page boundaries.
- **Out-of-Range Pages:** If `page > totalPages`, the API responds with `articles: []`, maintaining the true `total` count, `hasNextPage: false`, and `hasPrevPage: true`.

#### Visibility & Role Scoping
- **Writers:**
  - View articles where `authorId = req.user.id` OR `sectionId IN (assignedActiveSections)`.
  - Articles in archived sections are restricted to author-only visibility.
  - Filtering by an unassigned `sectionId` returns 0 matching results without disclosing section existence.
- **Editors:**
  - Full newsroom visibility across active and archived sections.

#### Example Request
```http
GET /api/articles?q=quantum&status=APPROVED&sortBy=createdAt&order=desc&page=1&limit=10
Authorization: Bearer <token>
```

#### Example Response (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "id": "cmv_art_001",
      "title": "Quantum Semiconductor Benchmarks in Silicon",
      "status": "APPROVED",
      "sectionId": "cmv_sec_tech",
      "authorId": "cmv_usr_maya",
      "publishAt": "2026-11-01T10:00:00.000Z",
      "publishedAt": null,
      "scheduleSequence": 1,
      "version": 2,
      "createdAt": "2026-10-20T08:00:00.000Z",
      "updatedAt": "2026-10-21T14:30:00.000Z",
      "section": {
        "id": "cmv_sec_tech",
        "name": "Technology & Silicon",
        "isArchived": false
      },
      "author": {
        "id": "cmv_usr_maya",
        "name": "Maya Patel",
        "email": "writer@dispatch.com",
        "role": "WRITER"
      },
      "workingRevision": {
        "id": "cmv_rev_001",
        "revisionNumber": 1,
        "title": "Quantum Semiconductor Benchmarks in Silicon",
        "status": "APPROVED",
        "updatedAt": "2026-10-21T14:30:00.000Z"
      },
      "publishedRevision": null,
      "_count": {
        "revisions": 1,
        "comments": 3,
        "timelineEvents": 4
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

---

## 3. Editorial Calendar CSV Export

### `GET /api/calendar/export.csv`

Exports scheduled publication queues and live journalistic records as a standardized, streaming CSV file for newsroom desk planners and editors.

#### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `from` | ISO Date String (`YYYY-MM-DD` or ISO-8601) | No | Earliest publication boundary (inclusive). |
| `to` | ISO Date String (`YYYY-MM-DD` or ISO-8601) | No | Latest publication boundary (inclusive end-of-day: `23:59:59.999Z`). |
| `sectionId` | String | No | Optional section filter. |

#### Inclusion Rules
- **Lifecycle Filter:** Only articles in `SCHEDULED` or `PUBLISHED` status are exported. Drafts, in-review pieces, and unapproved articles are excluded.
- **Chronological Ordering:** Sorted chronologically by target publication time (`publishAt ASC`, `publishedAt ASC`, `id ASC`).
- **Role Scoping:** Writers export only pieces they authored or in desks they are assigned to. Editors export across the entire newsroom.

#### CSV Schema (Columns)
1. `Article ID`: Stable database identifier.
2. `Article Title`: Active headline (canonical published headline for live pieces, scheduled revision headline for scheduled pieces).
3. `Section Name`: Name of the editorial desk.
4. `Author Name`: Writer's display name.
5. `Author Email`: Author's email address.
6. `Current Status`: `SCHEDULED` or `PUBLISHED`.
7. `Scheduled Publish Time`: Target publication timestamp (ISO-8601 string or empty).
8. `Actual Published Time`: Exact moment article went live (ISO-8601 string or empty).
9. `Revision Number`: Active revision number.

#### Security Safeguards
- **CSV Formula Injection Defense (CWE-1236):** Any field beginning with formula execution characters (`=`, `+`, `-`, `@`, `\t`, `\r`) is prepended with a single quote (`'`), neutralizing spreadsheet formula execution in Microsoft Excel, LibreOffice Calc, and Google Sheets.
- **Delimiter & Quote Escaping:** Cells containing commas, double quotes, newlines, or prepended quotes are enclosed in double quotes with internal quotes escaped (`""`).
- **Response Headers:**
  - `Content-Type: text/csv; charset=utf-8`
  - `Content-Disposition: attachment; filename="editorial-calendar.csv"`
- **Empty Set Behavior:** If no articles match the criteria, a valid CSV containing the standard header row is returned.

#### Example CSV Output
```csv
Article ID,Article Title,Section Name,Author Name,Author Email,Current Status,Scheduled Publish Time,Actual Published Time,Revision Number
cmv_art_001,"Quantum Semiconductor Benchmarks in Silicon",Technology & Silicon,Maya Patel,writer@dispatch.com,PUBLISHED,,2026-10-22T08:00:00.000Z,1
cmv_art_002,"Autonomous Microgrids in Island Networks",Technology & Silicon,Maya Patel,writer@dispatch.com,SCHEDULED,2026-11-01T09:00:00.000Z,,2
```

---

## 4. Error Responses

| Status Code | Error Message / Condition |
|---|---|
| `400 Bad Request` | `Field 'page' must be a positive integer.` |
| `400 Bad Request` | `Field 'limit' must be a positive integer between 1 and 100.` |
| `400 Bad Request` | `Invalid sortBy field '<field>'. Allowed fields: ...` |
| `400 Bad Request` | `Invalid order value. Allowed values: 'asc', 'desc'.` |
| `400 Bad Request` | `Invalid 'from' date format. Expected valid ISO-8601 date.` |
| `400 Bad Request` | `'from' date must be before or equal to 'to' date.` |
| `401 Unauthorized` | Missing, expired, or invalid JWT Bearer token. |
