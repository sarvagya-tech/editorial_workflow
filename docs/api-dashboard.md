# Editorial Dashboard & Analytics API Specification (Phase 8)

## Overview

The Editorial Dashboard API (`GET /api/dashboard`) aggregates real-time newsroom productivity metrics, workflow status distributions, active section coverage, and an 8-week publication trend. All calculations enforce **strict server-side role scoping**, **zero-disclosure authorization**, and **UTC calendar week boundaries**.

---

## 1. Endpoint

### `GET /api/dashboard`

**Authentication:** Required (`Bearer <JWT>`)  
**Authorized Roles:** `EDITOR`, `WRITER`

**Request Headers:**
```http
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Success Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "inReview": 2,
      "scheduledThisWeek": 3,
      "publishedThisWeek": 1,
      "openDrafts": 1
    },
    "byStatus": [
      { "status": "DRAFT", "count": 1 },
      { "status": "IN_REVIEW", "count": 2 },
      { "status": "APPROVED", "count": 1 },
      { "status": "SCHEDULED", "count": 3 },
      { "status": "PUBLISHED", "count": 8 }
    ],
    "bySection": [
      {
        "sectionId": "cmv1234567890tech",
        "sectionName": "Technology & Silicon",
        "count": 5
      },
      {
        "sectionId": "cmv1234567890politics",
        "sectionName": "Politics & Civic Affairs",
        "count": 4
      }
    ],
    "weeklyPublications": [
      { "weekStart": "2026-08-31", "count": 1 },
      { "weekStart": "2026-09-07", "count": 1 },
      { "weekStart": "2026-09-14", "count": 1 },
      { "weekStart": "2026-09-21", "count": 1 },
      { "weekStart": "2026-09-28", "count": 1 },
      { "weekStart": "2026-10-05", "count": 1 },
      { "weekStart": "2026-10-12", "count": 1 },
      { "weekStart": "2026-10-19", "count": 1 }
    ]
  }
}
```

---

## 2. Summary Metric Definitions

1. **`inReview`**:
   - Total number of articles whose current top-level workflow status is `IN_REVIEW`.
   - Represents the editorial pipeline queue awaiting editor review and approval.

2. **`scheduledThisWeek`**:
   - Total number of articles currently in `SCHEDULED` status whose scheduled `publishAt` timestamp falls within the current calendar week (`[currentWeekStart, currentWeekEnd]`).
   - Articles scheduled for future weeks are excluded.

3. **`publishedThisWeek`**:
   - Total number of articles currently in `PUBLISHED` status whose actual `publishedAt` timestamp falls within the current calendar week (`[currentWeekStart, currentWeekEnd]`).
   - If an article was scheduled for this week but has not yet reached publication time, it is counted under `scheduledThisWeek`, **never** `publishedThisWeek`.
   - If an article was published and subsequently unpublished (reverted to `APPROVED`), it is **not** counted in `publishedThisWeek`.

4. **`openDrafts`**:
   - Total number of articles currently in `DRAFT` status.
   - Represents active writing work in progress that has not yet been submitted for editorial sign-off.

---

## 3. Week Boundaries & Timezone Policy

- **Calendar Week Standard:** Adheres strictly to the **ISO-8601 week definition**:
  - **Week Start:** Monday at `00:00:00.000Z` (UTC).
  - **Week End:** Sunday at `23:59:59.999Z` (UTC).
- **Timezone Safety:** All week boundary calculations are executed in **Coordinated Universal Time (UTC)**. This prevents silent aggregation shifts, daylight-saving time edge cases, or discrepancies between server-local time, database server time, and browser time.

---

## 4. Status and Section Breakdown Semantics

- **`byStatus`**:
  - Always returns an array containing all five canonical workflow statuses in state-machine progression order: `['DRAFT', 'IN_REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHED']`.
  - Any status with zero matching articles returns `{ "status": "<STATUS>", "count": 0 }`.
- **`bySection`**:
  - Lists active editorial desks accessible to the calling user, along with the count of authorized articles in each section.
  - Sections with zero articles report `"count": 0`.
- **Archived Content Policy:**
  - Archived sections (`isArchived: true`) represent retired desks and historical archives. They are **excluded** from active newsroom summary counts, status distributions, and active section lists to prevent obsolete records from distorting active editorial metrics.

---

## 5. Eight-Week Publication Trend

- **Structure:** An array of exactly 8 consecutive calendar weeks, ending with the current calendar week.
- **Chronological Ordering:** Sorted chronologically from oldest week (Index 0, 7 weeks ago) to newest week (Index 7, current week).
- **Zero-Fill Guarantee:** Every week in the 8-week window is included; weeks with zero published articles return `"count": 0`.
- **Labeling:** Each entry includes `weekStart` formatted as an ISO-8601 date string `YYYY-MM-DD` representing the Monday of that week.
- **Data Source:** Counts articles with `status = 'PUBLISHED'` and `publishedAt >= weekStart AND publishedAt <= weekEnd`.

---

## 6. Role-Based Visibility & Authorization

All metrics and breakdowns enforce server-side access controls **at the database query layer**:

| Role | Visibility Scope | Restrictions |
| :--- | :--- | :--- |
| **`EDITOR`** | Entire active newsroom | Sees all articles across all active sections. |
| **`WRITER`** | Scoped strictly to: <br>1. Articles authored by the writer (`authorId = user.id`)<br>2. Articles in active sections assigned to the writer | Inaccessible articles, other writers' private drafts, and unassigned sections are completely excluded from aggregation queries. Counts never leak inaccessible records. |

---

## 7. Performance & Query Strategy

- Aggregations utilize parameterized database queries (`prisma.article.count` and `prisma.article.groupBy`) with composite index support.
- Summary metrics and weekly buckets execute in parallel using asynchronous `Promise.all` concurrency.
- Raw article bodies and full record sets are never loaded into Node.js application memory.
