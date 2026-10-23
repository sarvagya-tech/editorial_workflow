# Bulk Workflow API Specification (Phase 7)

## Overview

The Bulk Workflow engine enables editorial teams to transition multiple articles simultaneously through scheduling and unpublishing operations. To ensure strict editorial governance, audit integrity, and data safety, the bulk endpoints implement **per-article isolated transactions**, **per-article outcome reporting**, and **spreadsheet/timeline audit guarantees**.

---

## 1. Endpoints Summary

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/articles/bulk/schedule` | `EDITOR` | Schedules a batch of approved articles for a common future timestamp. |
| `POST` | `/api/articles/bulk/unpublish` | `EDITOR` | Unpublishes a batch of scheduled or published articles back to `APPROVED`. |

---

## 2. Request Specifications

### A. Bulk Schedule

**Route:** `POST /api/articles/bulk/schedule`

**Authentication:** Required (`Bearer <JWT>`)
**Role Required:** `EDITOR`

**Request Headers:**
```http
Content-Type: application/json
Authorization: Bearer <editor-token>
```

**Request Payload:**
```json
{
  "articleIds": [
    "cly1234567890abcdef1",
    "cly1234567890abcdef2",
    "cly1234567890abcdef3"
  ],
  "scheduledAt": "2026-10-30T14:00:00.000Z"
}
```

#### Validation & Constraints:
- `articleIds`: Non-empty array of valid string IDs.
- `batchSize`: Minimum 1, maximum 100 items per request.
- `duplicates`: Rejects requests containing duplicate IDs with HTTP 400 (`"Duplicate article ID ... detected in request payload"`).
- `scheduledAt`: Required ISO-8601 string representing a strictly future timestamp (`> Date.now()`). Past dates and malformed strings are rejected with HTTP 400.

---

### B. Bulk Unpublish

**Route:** `POST /api/articles/bulk/unpublish`

**Authentication:** Required (`Bearer <JWT>`)
**Role Required:** `EDITOR`

**Request Headers:**
```http
Content-Type: application/json
Authorization: Bearer <editor-token>
```

**Request Payload:**
```json
{
  "articleIds": [
    "cly1234567890abcdef1",
    "cly1234567890abcdef2"
  ],
  "reason": "Retracted for fact-checking review regarding financial disclosures."
}
```

#### Validation & Constraints:
- `articleIds`: Non-empty array of valid string IDs (max 100, no duplicates).
- `reason`: Optional string explaining the editorial retraction (max 500 characters).

---

## 3. Workflow Preconditions & Eligibility

### Bulk Scheduling Preconditions
1. **Article Existence:** The article must exist in the database.
2. **Current Status:** The article's active working revision must be in `APPROVED` status.
   - `DRAFT` articles cannot be scheduled.
   - `IN_REVIEW` articles cannot be scheduled without explicit editor approval.
   - Already `SCHEDULED` articles return a failure explaining they are already scheduled.
3. **Replacement Revision Safety:** If an article is already `PUBLISHED` on the live site, and an editor schedules an approved replacement revision (e.g. Revision #2), the article's live published revision pointer (`publishedRevisionId`) remains on Revision #1. Readers continue to see the published snapshot until Revision #2 is published live.

### Bulk Unpublishing Preconditions
1. **Current Status:** The article must currently be in `SCHEDULED` or `PUBLISHED` status.
2. **Ineligible States:** Articles already in `APPROVED`, `DRAFT`, or `IN_REVIEW` cannot be unpublished and return an informative per-item rejection reason.
3. **History Preservation:** Historical snapshots (`article_revisions`) and the `publishedRevisionId` historical pointer are preserved intact. Unpublishing reverts the active workflow state to `APPROVED` and clears active future schedule timestamps (`publishAt: null`).

---

## 4. Response Format & Per-Article Reporting

Bulk operations return HTTP 200 whenever the request payload itself is valid, even if some or all individual articles fail their transition preconditions. This ensures that the client receives complete diagnostic information for every requested item without partial state concealment.

### Illustrative Response (Mixed Results)

```json
{
  "success": true,
  "message": "Bulk scheduling completed",
  "summary": {
    "requested": 3,
    "succeeded": 2,
    "failed": 1
  },
  "results": [
    {
      "articleId": "cly1234567890abcdef1",
      "success": true,
      "previousStatus": "APPROVED",
      "currentStatus": "SCHEDULED"
    },
    {
      "articleId": "cly1234567890abcdef2",
      "success": false,
      "reason": "Cannot schedule article: current revision status is DRAFT, expected APPROVED.",
      "previousStatus": "DRAFT"
    },
    {
      "articleId": "cly1234567890abcdef3",
      "success": true,
      "previousStatus": "APPROVED",
      "currentStatus": "SCHEDULED"
    }
  ]
}
```

### Result Item Schema
- `articleId` (*string*): The identifier of the requested article.
- `success` (*boolean*): `true` if the transition committed to the database, `false` otherwise.
- `previousStatus` (*string*, optional): Workflow status immediately preceding the attempted operation.
- `currentStatus` (*string*, optional): Workflow status resulting from a successful transition.
- `reason` (*string*, optional): Actionable, safe explanation of failure when `success: false`.

---

## 5. Transaction Safety & Concurrency Control

1. **Per-Article Isolated Transactions:** Each article's status transition and its corresponding timeline event are executed inside an isolated interactive Prisma transaction (`prisma.$transaction(..., { maxWait: 15000, timeout: 30000 })`). A failure on one article rolls back only that article's changes, leaving other articles unaffected.
2. **Optimistic Concurrency Control:** Article rows maintain an integer `version` field. State changes enforce `where: { id: articleId, version: article.version }` and increment `version`. If another process updates the article concurrently, Prisma raises `P2025`, resulting in a safe concurrency rejection (`409 Conflict` reason) rather than silent data overwrites.
3. **Timeline Immutability:** Successful state changes record an immutable `timeline_events` audit row atomically within the same transaction. If the transaction aborts, no audit event is created. Deletions or updates to `timeline_events` are blocked by the database engine trigger `trg_timeline_immutable`.

---

## 6. Idempotency & Retry Semantics

- **Network Retries:** If a client re-submits a bulk request after a connection timeout:
  - Already-scheduled articles fail with `"Cannot schedule article: current revision status is SCHEDULED, expected APPROVED."`
  - Already-unpublished articles fail with `"Cannot unpublish article: current status is APPROVED. Only SCHEDULED or PUBLISHED articles can be unpublished."`
  - No duplicate timeline events are inserted for already-processed articles.
- **Duplicate IDs in Request:** Requests containing duplicate IDs in `articleIds` are immediately rejected with HTTP 400 Bad Request before database execution begins.

---

## 7. HTTP Status Code Conventions

| Status Code | Description | Scenario |
| :--- | :--- | :--- |
| `200 OK` | Batch execution completed. | Valid batch request processed (check `summary` and `results`). |
| `400 Bad Request` | Request-level validation error. | Empty array, batch > 100, duplicate IDs, past/invalid timestamp. |
| `401 Unauthorized` | Missing or invalid authentication. | Missing Bearer token or expired JWT session. |
| `403 Forbidden` | Insufficient permissions. | Role is `WRITER` instead of `EDITOR`. |
