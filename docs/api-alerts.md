# Overdue Article Alerts API Specification (Phase 9)

## 1. Overview & Overdue Definition

In the Editorial Workflow Management System (*The Dispatch*), an article is defined as **Overdue** if and only if **all** of the following conditions hold:

1. **Current Workflow Status**: The article's status is strictly `SCHEDULED`.
2. **Valid Scheduled Time**: It possesses a valid `publishAt` ISO-8601 timestamp.
3. **Time Passed**: The `publishAt` timestamp is strictly earlier than the evaluation timestamp (`publishAt < now`).
4. **Active Section**: The article belongs to an active, non-archived section (`section.isArchived === false`).
5. **No Active Dismissal**: The article has not been dismissed for its current `scheduleSequence` generation.
6. **Ineligible Statuses Excluded**: An article that is `PUBLISHED`, `DRAFT`, `IN_REVIEW`, or `APPROVED` is **never** considered overdue, even if its historical `publishAt` date is in the past.

---

## 2. Occurrence Tracking & Alert Lifecycle

Alert dismissal is strictly scoped to an **individual scheduling occurrence**, not permanently to the article:

`Scheduled → Due (publishAt < now) → Overdue Alert → Dismissed or Rescheduled → Potentially Overdue Again`

### Mechanism
- Each article tracks an integer `scheduleSequence` (initialized at `0`).
- Every scheduling or rescheduling transition (`workflowService.scheduleArticle`) increments `scheduleSequence` by 1.
- Dismissals are persisted in the `alert_dismissals` table with a composite unique constraint `@@unique([articleId, scheduleSequence])`.
- When an article is rescheduled, its `scheduleSequence` increments to `N + 1`. The previous dismissal record for sequence `N` remains in database history for auditing purposes, but does **not** suppress notifications for sequence `N + 1`.
- If the new publication time for sequence `N + 1` passes while the article remains in `SCHEDULED` status, the alert **reappears automatically**.

---

## 3. API Endpoints

### 3.1 `GET /api/alerts/overdue`

Returns active, non-dismissed overdue alerts visible to the authenticated user.

- **Authentication**: Required (`Bearer <JWT>`).
- **Authorization**:
  - `EDITOR`: Sees newsroom-wide overdue articles across all active sections. Items have `dismissible: true`.
  - `WRITER`: Scoped view — only sees overdue articles authored by the caller or located within active sections assigned to the caller. Items have `dismissible: false`.

#### Request
```http
GET /api/alerts/overdue HTTP/1.1
Host: localhost:5000
Authorization: Bearer <JWT>
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "cmvf2fjae000mwm78ovki64zq-1",
      "articleId": "cmvf2fjae000mwm78ovki64zq",
      "title": "Autonomous Drone Deliveries Face Stringent Aviation Oversight",
      "status": "SCHEDULED",
      "sectionId": "cmvf2f9280000wm789o1y0vxy",
      "sectionName": "Technology & Silicon",
      "authorId": "cmvf2f93g0003wm78h1a4kef1",
      "authorName": "Maya Patel",
      "authorEmail": "writer@dispatch.com",
      "publishAt": "2026-10-23T14:30:00.000Z",
      "scheduleSequence": 1,
      "overdueSince": "2026-10-23T14:30:00.000Z",
      "overdueDurationMs": 7200000,
      "overdueDurationHuman": "Overdue by 2 hours",
      "dismissible": true
    }
  ],
  "alerts": [ /* same array for backwards-compatibility */ ],
  "total": 1
}
```

---

### 3.2 `GET /api/alerts/count`

Returns a fast count of currently active, non-dismissed overdue alerts for navigation badges and status bars.

#### Request
```http
GET /api/alerts/count HTTP/1.1
Host: localhost:5000
Authorization: Bearer <JWT>
```

#### Response (200 OK)
```json
{
  "success": true,
  "count": 1
}
```

---

### 3.3 `POST /api/articles/:id/alerts/dismiss` (and `POST /api/alerts/:id/dismiss`)

Dismisses the current overdue alert for the specified article and its current `scheduleSequence`.

- **Authentication**: Required (`Bearer <JWT>`).
- **Authorization**: `EDITOR` role required. Writers receive `403 Forbidden`.
- **Preconditions**:
  1. Article must exist (otherwise `404 Not Found`).
  2. Article status must be `SCHEDULED` (otherwise `400 Bad Request`).
  3. Article `publishAt` must be strictly in the past (otherwise `400 Bad Request`).
- **Idempotency**: Repeated dismissal requests for the same sequence return `200 OK` with `alreadyDismissed: true`.
- **Audit Logging**: Atomically inserts an immutable `ALERT_DISMISSED` event into `timeline_events`.

#### Request
```http
POST /api/articles/cmvf2fjae000mwm78ovki64zq/alerts/dismiss HTTP/1.1
Host: localhost:5000
Authorization: Bearer <EDITOR_JWT>
Content-Type: application/json
```

#### Response (200 OK — First dismissal)
```json
{
  "success": true,
  "message": "Overdue alert dismissed successfully.",
  "data": {
    "success": true,
    "message": "Overdue alert dismissed successfully.",
    "articleId": "cmvf2fjae000mwm78ovki64zq",
    "scheduleSequence": 1
  }
}
```

#### Response (200 OK — Idempotent repeat)
```json
{
  "success": true,
  "message": "Alert has already been dismissed for this schedule occurrence.",
  "data": {
    "success": true,
    "message": "Alert has already been dismissed for this schedule occurrence.",
    "articleId": "cmvf2fjae000mwm78ovki64zq",
    "scheduleSequence": 1,
    "alreadyDismissed": true
  }
}
```

---

## 4. Dashboard Metrics Integration

`GET /api/dashboard` includes overdue alert metrics in its canonical payload:

```json
{
  "summary": {
    "inReview": 5,
    "scheduledThisWeek": 13,
    "publishedThisWeek": 14,
    "openDrafts": 15,
    "overdueAlerts": 1
  },
  "overdueAlerts": [
    {
      "id": "cmvf2fjae000mwm78ovki64zq-1",
      "articleId": "cmvf2fjae000mwm78ovki64zq",
      "title": "Autonomous Drone Deliveries Face Stringent Aviation Oversight",
      "status": "SCHEDULED",
      "overdueDurationHuman": "Overdue by 2 hours"
    }
  ],
  "byStatus": [ ... ],
  "bySection": [ ... ],
  "weeklyPublications": [ ... ]
}
```

---

## 5. Timestamp and Timezone Conventions

- All timestamps in the API and database are serialized in **UTC** adhering to **ISO-8601** (e.g. `2026-10-23T14:30:00.000Z`).
- Date comparisons for overdue determination are performed at millisecond epoch granularity: `publishAt.getTime() < now.getTime()`.
- Human-readable overdue durations are formatted dynamically:
  - `< 1 minute`: `"Overdue by < 1 minute"`
  - `1–59 minutes`: `"Overdue by X minute(s)"`
  - `1–23 hours`: `"Overdue by X hour(s)"`
  - `≥ 24 hours`: `"Overdue by X day(s)"`

---

## 6. Error Responses

| Status Code | Reason | Example Response |
| :--- | :--- | :--- |
| `401 Unauthorized` | Missing or invalid JWT bearer token | `{"error": "Authentication token missing or invalid."}` |
| `403 Forbidden` | Writer attempting to dismiss alert | `{"error": "Only editors can dismiss overdue article alerts."}` |
| `404 Not Found` | Article ID does not exist | `{"error": "Article not found."}` |
| `400 Bad Request` | Article status is not `SCHEDULED` | `{"error": "Cannot dismiss alert: article status is DRAFT, expected SCHEDULED."}` |
| `400 Bad Request` | Article `publishAt` is in the future | `{"error": "Cannot dismiss alert: article is not overdue."}` |

---

## 7. Known Limitations & Architecture Notes

1. **Query-Time Evaluation**: Overdue detection is calculated deterministically on request. It does not depend on a background cron daemon that might stop or sleep on serverless infrastructure.
2. **Archived Sections**: Articles in archived sections are automatically excluded from the alert feed.
3. **Database Safety**: Re-scheduling and dismissals maintain strict referential integrity without deleting past audit history or dropping constraints.
