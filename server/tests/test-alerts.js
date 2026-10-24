import 'dotenv/config';
process.env.NODE_ENV = 'test';
import http from 'http';
import { prisma } from '../src/prisma.js';
import { formatHumanOverdueDuration } from '../src/services/alert.service.js';
const { default: app } = await import('../src/index.js');

let server;
let baseUrl;
const testResults = [];

function assert(condition, name, details = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${name}`);
    testResults.push({ name, passed: true });
  } else {
    console.error(`  ❌ FAIL: ${name} - ${details}`);
    testResults.push({ name, passed: false, details });
  }
}

async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

function getPayload(res) {
  if (!res || !res.data) return null;
  return res.data.data !== undefined ? res.data.data : res.data;
}

async function runTests() {
  console.log('====================================================');
  console.log('STARTING PHASE 9: OVERDUE ALERTS & UI TEST SUITE');
  console.log('====================================================\n');

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  let editorToken = null;
  let mayaToken = null; // Maya Patel (Tech & Politics)
  let elenaToken = null; // Elena Rostova (Culture)
  let techSection = null;
  let cultureSection = null;

  try {
    // 0. Neon compute warmup
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        await prisma.$queryRaw`SELECT 1`;
        break;
      } catch (err) {
        if (attempt === 5) throw err;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Authenticate test accounts
    const edLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'editor@dispatch.com', password: 'password123' },
    });
    editorToken = edLogin.data.token;

    const mayaLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'writer@dispatch.com', password: 'password123' },
    });
    mayaToken = mayaLogin.data.token;

    const elenaLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'elena.writer@dispatch.com', password: 'password123' },
    });
    elenaToken = elenaLogin.data.token;

    techSection = await prisma.section.findFirst({ where: { name: { contains: 'Tech' } } });
    cultureSection = await prisma.section.findFirst({ where: { name: { contains: 'Culture' } } });

    // ----------------------------------------------------
    // [Test Group 1: Unit tests for formatHumanOverdueDuration]
    // ----------------------------------------------------
    console.log('[Test Group 1: Overdue Duration Formatting]');
    assert(formatHumanOverdueDuration(-5000) === 'Scheduled in future', 'Negative diff resolves to "Scheduled in future"');
    assert(formatHumanOverdueDuration(30000) === 'Overdue by < 1 minute', 'Under 1 minute formatted correctly');
    assert(formatHumanOverdueDuration(65000) === 'Overdue by 1 minute', 'Single minute singular formatted correctly');
    assert(formatHumanOverdueDuration(300000) === 'Overdue by 5 minutes', 'Multiple minutes plural formatted correctly');
    assert(formatHumanOverdueDuration(3600000) === 'Overdue by 1 hour', 'Single hour singular formatted correctly');
    assert(formatHumanOverdueDuration(7200000) === 'Overdue by 2 hours', 'Multiple hours plural formatted correctly');
    assert(formatHumanOverdueDuration(86400000) === 'Overdue by 1 day', 'Single day singular formatted correctly');
    assert(formatHumanOverdueDuration(172800000) === 'Overdue by 2 days', 'Multiple days plural formatted correctly');

    // ----------------------------------------------------
    // [Test Group 2: Authentication & Role Enforcement]
    // ----------------------------------------------------
    console.log('\n[Test Group 2: Authentication & Role Authorization]');
    const unauthAlerts = await request('/api/alerts/overdue');
    assert(unauthAlerts.status === 401, 'Unauthenticated GET /api/alerts/overdue rejected with 401');

    const unauthCount = await request('/api/alerts/count');
    assert(unauthCount.status === 401, 'Unauthenticated GET /api/alerts/count rejected with 401');

    const unauthDismiss = await request('/api/alerts/fake-id/dismiss', { method: 'POST' });
    assert(unauthDismiss.status === 401, 'Unauthenticated POST /api/alerts/:id/dismiss rejected with 401');

    const unauthArticleDismiss = await request('/api/articles/fake-id/alerts/dismiss', { method: 'POST' });
    assert(unauthArticleDismiss.status === 401, 'Unauthenticated POST /api/articles/:id/alerts/dismiss rejected with 401');

    const writerDismissAlert = await request('/api/alerts/fake-id/dismiss', {
      method: 'POST',
      headers: { Authorization: `Bearer ${mayaToken}` },
    });
    assert(writerDismissAlert.status === 403, 'Writer forbidden from POST /api/alerts/:id/dismiss (403)');

    const writerDismissArticle = await request('/api/articles/fake-id/alerts/dismiss', {
      method: 'POST',
      headers: { Authorization: `Bearer ${mayaToken}` },
    });
    assert(writerDismissArticle.status === 403, 'Writer forbidden from POST /api/articles/:id/alerts/dismiss (403)');

    // ----------------------------------------------------
    // [Test Group 3: Overdue Detection Lifecycle]
    // ----------------------------------------------------
    console.log('\n[Test Group 3: Overdue Detection Lifecycle]');

    // 1. Create a fresh test article in Tech section
    const artRes = await request('/api/articles', {
      method: 'POST',
      headers: { Authorization: `Bearer ${mayaToken}` },
      body: {
        title: `Phase 9 Overdue Detection Test ${Date.now()}`,
        body: 'Article content for testing overdue detection and dismissal lifecycle.',
        sectionId: techSection.id,
      },
    });
    assert(artRes.status === 201, 'Test article created in DRAFT status');
    const testArt = getPayload(artRes);

    // Initial alert count
    const initialCountRes = await request('/api/alerts/count', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(initialCountRes.status === 200, 'GET /api/alerts/count succeeds 200');
    const baseOverdueCount = initialCountRes.data.count;

    // DRAFT article is not overdue
    const alertsBeforeSchedule = await request('/api/alerts/overdue', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(
      !alertsBeforeSchedule.data.alerts.some((a) => a.articleId === testArt.id),
      'DRAFT article is not present in overdue alerts'
    );

    // Transition to IN_REVIEW
    await request(`/api/articles/${testArt.id}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${mayaToken}` },
    });

    // Editor approves
    await request(`/api/articles/${testArt.id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editorToken}` },
    });

    // Schedule into future (2 days from now)
    const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const schedRes = await request(`/api/articles/${testArt.id}/schedule`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editorToken}` },
      body: { scheduledAt: futureDate },
    });
    assert(schedRes.status === 200, 'Article successfully scheduled for future date');

    // Future scheduled article must NOT be overdue
    const alertsAfterFutureSched = await request('/api/alerts/overdue', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(
      !alertsAfterFutureSched.data.alerts.some((a) => a.articleId === testArt.id),
      'Future scheduled article is excluded from overdue alerts'
    );

    // Now simulate time passing: set publishAt to 2 hours ago while keeping status SCHEDULED
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await prisma.article.update({
      where: { id: testArt.id },
      data: { publishAt: twoHoursAgo },
    });

    // Now query overdue alerts: article MUST appear as overdue!
    const alertsAfterOverdue = await request('/api/alerts/overdue', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    const foundAlert = alertsAfterOverdue.data.alerts.find((a) => a.articleId === testArt.id);
    assert(Boolean(foundAlert), 'Past-scheduled article appears in active overdue alerts');
    assert(foundAlert?.status === 'SCHEDULED', 'Alert reflects SCHEDULED status');
    assert(foundAlert?.sectionName === techSection.name, 'Alert includes correct section name');
    assert(foundAlert?.scheduleSequence === 1, 'Alert reflects scheduleSequence 1');
    assert(foundAlert?.dismissible === true, 'Alert is dismissible by Editor');
    assert(foundAlert?.overdueDurationHuman?.includes('hour'), 'Alert includes human-readable overdue duration');

    // Count must have increased by 1
    const countAfterOverdue = await request('/api/alerts/count', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(
      countAfterOverdue.data.count === baseOverdueCount + 1,
      `Active alert count increased by 1 (was ${baseOverdueCount}, now ${countAfterOverdue.data.count})`
    );

    // ----------------------------------------------------
    // [Test Group 4: Scoping and Visibility]
    // ----------------------------------------------------
    console.log('\n[Test Group 4: Scoping and Visibility]');
    // Maya Patel is assigned to Tech section -> can see alert, but cannot dismiss
    const mayaAlerts = await request('/api/alerts/overdue', {
      headers: { Authorization: `Bearer ${mayaToken}` },
    });
    const mayaAlert = mayaAlerts.data.alerts.find((a) => a.articleId === testArt.id);
    assert(Boolean(mayaAlert), 'Writer assigned to section can see overdue alert in their feed');
    assert(mayaAlert?.dismissible === false, 'Alert is marked dismissible: false for Writer');

    // Elena Rostova is assigned ONLY to Culture section -> cannot see Tech alert
    const elenaAlerts = await request('/api/alerts/overdue', {
      headers: { Authorization: `Bearer ${elenaToken}` },
    });
    const elenaAlert = elenaAlerts.data.alerts.find((a) => a.articleId === testArt.id);
    assert(!elenaAlert, 'Writer unassigned to section cannot see overdue alert');

    // ----------------------------------------------------
    // [Test Group 5: Alert Dismissal & Idempotency]
    // ----------------------------------------------------
    console.log('\n[Test Group 5: Alert Dismissal & Idempotency]');

    // Dismiss using POST /api/articles/:id/alerts/dismiss
    const dismissRes = await request(`/api/articles/${testArt.id}/alerts/dismiss`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(dismissRes.status === 200, 'POST /api/articles/:id/alerts/dismiss succeeds 200');
    assert(dismissRes.data.success === true, 'Dismissal response reports success: true');

    // Verify AlertDismissal record in database
    const dbDismissal = await prisma.alertDismissal.findUnique({
      where: {
        articleId_scheduleSequence: {
          articleId: testArt.id,
          scheduleSequence: 1,
        },
      },
    });
    assert(Boolean(dbDismissal), 'AlertDismissal record persisted with scheduleSequence = 1');

    // Verify TimelineEvent recorded
    const timelineEvents = await prisma.timelineEvent.findMany({
      where: {
        articleId: testArt.id,
        eventType: 'ALERT_DISMISSED',
      },
    });
    assert(timelineEvents.length === 1, 'ALERT_DISMISSED audit timeline event recorded in database');

    // Verify active alert list NO LONGER contains the dismissed article
    const alertsAfterDismiss = await request('/api/alerts/overdue', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(
      !alertsAfterDismiss.data.alerts.some((a) => a.articleId === testArt.id),
      'Dismissed alert is removed from active overdue alerts'
    );

    // Verify count decreased back to base
    const countAfterDismiss = await request('/api/alerts/count', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(
      countAfterDismiss.data.count === baseOverdueCount,
      'Active alert count returned to baseline after dismissal'
    );

    // Idempotent retry of dismissal
    const repeatDismiss = await request(`/api/articles/${testArt.id}/alerts/dismiss`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(repeatDismiss.status === 200, 'Repeated dismissal returns 200 (idempotent)', JSON.stringify(repeatDismiss));
    assert(repeatDismiss.data?.data?.alreadyDismissed === true || repeatDismiss.data?.alreadyDismissed === true, 'Repeated dismissal reports alreadyDismissed: true', JSON.stringify(repeatDismiss));

    // ----------------------------------------------------
    // [Test Group 6: Rescheduling Revives Alert (Sequence 2)]
    // ----------------------------------------------------
    console.log('\n[Test Group 6: Rescheduling Revives Alert]');

    // Reschedule article: workflow engine increments scheduleSequence to 2
    // If autonomous background publisher worker published testArt while it was overdue, unpublish to APPROVED first
    const preReschedArt = await prisma.article.findUnique({ where: { id: testArt.id } });
    if (preReschedArt && preReschedArt.status === 'PUBLISHED') {
      await request(`/api/articles/${testArt.id}/unpublish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${editorToken}` },
        body: { reason: 'Resetting published article to APPROVED for reschedule test' },
      });
    }

    const newFutureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const rescheduleRes = await request(`/api/articles/${testArt.id}/schedule`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editorToken}` },
      body: { scheduledAt: newFutureDate },
    });
    assert(rescheduleRes.status === 200, 'Article rescheduled to new future date', JSON.stringify(rescheduleRes));

    const updatedArt = await prisma.article.findUnique({ where: { id: testArt.id } });
    assert(updatedArt?.scheduleSequence === 2, 'Article scheduleSequence incremented to 2', JSON.stringify(updatedArt));

    // Check alert: still in future, so not overdue
    const alertsAfterRescheduleFuture = await request('/api/alerts/overdue', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(
      !alertsAfterRescheduleFuture.data.alerts.some((a) => a.articleId === testArt.id),
      'Rescheduled article in future is not overdue'
    );

    // Simulate time passing on sequence 2: set publishAt to 1 hour ago
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    await prisma.article.update({
      where: { id: testArt.id },
      data: { publishAt: oneHourAgo },
    });

    // Alert MUST reappear because the sequence is now 2, and previous dismissal was for sequence 1!
    const alertsReappeared = await request('/api/alerts/overdue', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    const revivedAlert = alertsReappeared.data.alerts.find((a) => a.articleId === testArt.id);
    assert(Boolean(revivedAlert), 'Alert correctly REAPPEARS after rescheduling to new sequence');
    assert(revivedAlert?.scheduleSequence === 2, 'Reappeared alert reflects scheduleSequence = 2');

    // Test alternative endpoint: POST /api/alerts/:id/dismiss
    const altDismiss = await request(`/api/alerts/${testArt.id}/dismiss`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(altDismiss.status === 200, 'Alternative endpoint POST /api/alerts/:id/dismiss succeeds 200');

    // Check database has both dismissals (sequence 1 and sequence 2)
    const allDismissals = await prisma.alertDismissal.findMany({
      where: { articleId: testArt.id },
      orderBy: { scheduleSequence: 'asc' },
    });
    assert(allDismissals.length === 2, 'Both dismissal occurrences preserved in database (sequences 1 and 2)');
    assert(allDismissals[0].scheduleSequence === 1 && allDismissals[1].scheduleSequence === 2, 'Occurrences tracked individually by scheduleSequence');

    // ----------------------------------------------------
    // [Test Group 7: Workflow Transitions Remove Alerts]
    // ----------------------------------------------------
    console.log('\n[Test Group 7: Workflow Transitions Remove Alerts]');

    // Create another article to test publication removal
    const art2Res = await request('/api/articles', {
      method: 'POST',
      headers: { Authorization: `Bearer ${mayaToken}` },
      body: {
        title: `Phase 9 Publication Exclude Test ${Date.now()}`,
        body: 'Testing that publication removes overdue alerts.',
        sectionId: techSection.id,
      },
    });
    const art2 = getPayload(art2Res);
    await request(`/api/articles/${art2.id}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${mayaToken}` },
    });
    await request(`/api/articles/${art2.id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    await request(`/api/articles/${art2.id}/schedule`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editorToken}` },
      body: { scheduledAt: new Date(Date.now() + 10000).toISOString() },
    });
    // Set publishAt in past
    await prisma.article.update({
      where: { id: art2.id },
      data: { publishAt: new Date(Date.now() - 3600000) },
    });

    const alertsArt2Overdue = await request('/api/alerts/overdue', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(
      alertsArt2Overdue.data.alerts.some((a) => a.articleId === art2.id),
      'Article 2 appears in overdue alerts'
    );

    // Publish Article 2
    const publishRes = await request(`/api/articles/${art2.id}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(publishRes.status === 200, 'Article 2 transitioned to PUBLISHED');

    // Even though publishAt is in the past, PUBLISHED status MUST exclude it from alerts
    const alertsAfterPublish = await request('/api/alerts/overdue', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(
      !alertsAfterPublish.data.alerts.some((a) => a.articleId === art2.id),
      'PUBLISHED article is excluded from overdue alerts despite past publishAt'
    );

    // Unpublish Article 2 (moves to DRAFT)
    const unpublishRes = await request(`/api/articles/${art2.id}/unpublish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editorToken}` },
      body: { reason: 'Testing unpublish alert exclusion' },
    });
    assert(unpublishRes.status === 200, 'Article 2 unpublished to DRAFT');

    const alertsAfterUnpublish = await request('/api/alerts/overdue', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(
      !alertsAfterUnpublish.data.alerts.some((a) => a.articleId === art2.id),
      'Unpublished DRAFT article is excluded from overdue alerts'
    );

    // ----------------------------------------------------
    // [Test Group 8: Dashboard Metrics Integration]
    // ----------------------------------------------------
    console.log('\n[Test Group 8: Dashboard Metrics Integration]');

    const dashRes = await request('/api/dashboard', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(dashRes.status === 200, 'GET /api/dashboard returns 200 OK');
    const dashData = getPayload(dashRes);
    assert(typeof dashData.summary.overdueAlerts === 'number', 'dashboard summary.overdueAlerts is a number');
    assert(Array.isArray(dashData.overdueAlerts), 'dashboard overdueAlerts is an array');

    const countCheck = await request('/api/alerts/count', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(
      dashData.summary.overdueAlerts === countCheck.data.count,
      `dashboard summary.overdueAlerts (${dashData.summary.overdueAlerts}) matches /api/alerts/count (${countCheck.data.count})`
    );

    // ----------------------------------------------------
    // [Test Group 9: Ineligible Alert Dismissals Return Clean Errors]
    // ----------------------------------------------------
    console.log('\n[Test Group 9: Ineligible Alert Dismissals]');

    // art2 is now in DRAFT status
    const dismissDraft = await request(`/api/articles/${art2.id}/alerts/dismiss`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(dismissDraft.status === 400, 'Dismissing alert on DRAFT article rejected with 400 Bad Request');

    // Non-existent article
    const dismissNonExistent = await request('/api/articles/00000000-0000-0000-0000-000000000000/alerts/dismiss', {
      method: 'POST',
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(dismissNonExistent.status === 404, 'Dismissing non-existent article rejected with 404 Not Found');

  } catch (err) {
    console.error('Unhandled test exception:', err);
    testResults.push({ name: 'Unhandled Exception', passed: false, details: err.message });
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  }

  console.log('\n====================================================');
  const passedCount = testResults.filter((t) => t.passed).length;
  const totalCount = testResults.length;
  console.log(`PHASE 9 OVERDUE ALERTS RESULTS: ${passedCount}/${totalCount} checks passed.`);
  console.log('====================================================\n');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
  process.exit(0);
}

runTests();
