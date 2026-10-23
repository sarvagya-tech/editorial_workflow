import 'dotenv/config';
process.env.NODE_ENV = 'test';
import http from 'http';
import { prisma } from './src/prisma.js';
import { config } from './src/config/index.js';
import {
  processDueScheduledArticles,
  getDatabaseClock,
  getSchedulerStatus,
} from './src/workers/scheduler.worker.js';
import { publishArticle, SYSTEM_ACTOR } from './src/services/workflow.service.js';
const { default: app } = await import('./src/index.js');

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
  console.log('STARTING SCHEDULED ARTICLE PUBLISHER TEST SUITE');
  console.log('====================================================\n');

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  let editorToken = null;
  let writerToken = null;
  let testSection = null;
  const createdArticleIds = [];

  try {
    // 0. Neon warmup and login
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        await prisma.$queryRaw`SELECT 1`;
        break;
      } catch (err) {
        if (attempt === 5) throw err;
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    const editorLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'editor@dispatch.com', password: 'password123' },
    });
    editorToken = editorLogin.data?.token || editorLogin.data?.data?.token;

    const writerLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'writer@dispatch.com', password: 'password123' },
    });
    writerToken = writerLogin.data?.token || writerLogin.data?.data?.token;

    testSection = await prisma.section.findFirst({ where: { name: { contains: 'Tech', mode: 'insensitive' } } });

    assert(Boolean(editorToken), 'Editor login returns valid session token');
    assert(Boolean(writerToken), 'Writer login returns valid session token');
    assert(Boolean(testSection), 'Found active testing section');

    console.log('[Setup: DB Clock & Operational Status]');
    const dbClock = await getDatabaseClock();
    assert(dbClock instanceof Date && !isNaN(dbClock.getTime()), 'Database clock query returns valid Date object');

    const status = getSchedulerStatus();
    assert(typeof status.isRunning === 'boolean', 'getSchedulerStatus returns isRunning boolean');
    assert(typeof status.intervalMs === 'number', 'getSchedulerStatus reports intervalMs');

    // Helper: Create an article in APPROVED status
    async function createApprovedArticle(titleSuffix) {
      const artRes = await request('/api/articles', {
        method: 'POST',
        headers: { Authorization: `Bearer ${writerToken}` },
        body: {
          title: `Autonomous Scheduler Test Article ${titleSuffix} [${Date.now()}]`,
          body: 'Detailed body for autonomous scheduled publication testing with sufficient length and characters.',
          sectionId: testSection.id,
        },
      });
      const article = artRes.data?.data || artRes.data;
      if (!article?.id) {
        throw new Error(`Failed to create article: ${JSON.stringify(artRes)}`);
      }
      createdArticleIds.push(article.id);

      // Submit
      await request(`/api/articles/${article.id}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${writerToken}` },
      });

      // Approve
      await request(`/api/articles/${article.id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${editorToken}` },
      });

      return article;
    }

    // -------------------------------------------------------------
    // Test 1: Due Scheduled Article Autonomous Publication
    // -------------------------------------------------------------
    console.log('\n[Test 1: Due Scheduled Article Autonomous Publication]');
    const art1 = await createApprovedArticle('Due');
    const pastTime = new Date(Date.now() - 120000); // 2 minutes ago

    // Directly set publishAt into the past to simulate due schedule
    await prisma.article.update({
      where: { id: art1.id },
      data: {
        status: 'SCHEDULED',
        publishAt: pastTime,
        scheduleSequence: 1,
      },
    });
    await prisma.articleRevision.updateMany({
      where: { articleId: art1.id },
      data: { status: 'SCHEDULED' },
    });

    const runResult1 = await processDueScheduledArticles();
    assert(runResult1.processedCount >= 1, 'processDueScheduledArticles picked up due article', `Processed: ${runResult1.processedCount}`);
    assert(runResult1.published.some((p) => p.id === art1.id), 'Due article ID is reported in published list');

    const freshArt1 = await prisma.article.findUnique({
      where: { id: art1.id },
      include: { timelineEvents: { orderBy: { createdAt: 'desc' } } },
    });
    assert(freshArt1.status === 'PUBLISHED', 'Due article transitioned status to PUBLISHED');
    assert(freshArt1.publishAt === null, 'Article publishAt timestamp cleared upon publication');
    assert(freshArt1.publishedAt !== null, 'Article publishedAt timestamp populated');
    assert(freshArt1.publishedRevisionId !== null, 'Article publishedRevisionId pointer populated');

    // Verify timeline event with SYSTEM_ACTOR
    const pubEvent = freshArt1.timelineEvents.find((e) => e.newStatus === 'PUBLISHED');
    assert(Boolean(pubEvent), 'Atomic timeline event recorded for PUBLISHED status transition');
    assert(pubEvent?.actorName === 'System Scheduler', 'Timeline event actorName is "System Scheduler"');
    assert(pubEvent?.actorId === null, 'Timeline event actorId is null (system actor, no editor impersonation)');
    assert(pubEvent?.metadata?.isAutomated === true, 'Timeline event metadata marks isAutomated: true');
    assert(pubEvent?.metadata?.publishedBy === 'SYSTEM_SCHEDULER', 'Timeline event metadata records publishedBy: SYSTEM_SCHEDULER');

    // -------------------------------------------------------------
    // Test 2: Not-Yet-Due Scheduled Article Is Not Published
    // -------------------------------------------------------------
    console.log('\n[Test 2: Not-Yet-Due Article Is Retained in SCHEDULED]');
    const art2 = await createApprovedArticle('Future');
    const futureTime = new Date(Date.now() + 3600000); // 1 hour in the future

    // Schedule for future via API
    const schedRes2 = await request(`/api/articles/${art2.id}/schedule`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editorToken}` },
      body: { scheduledAt: futureTime.toISOString() },
    });
    assert(schedRes2.status === 200, 'Article scheduled via API for future time responds 200');

    const runResult2 = await processDueScheduledArticles();
    assert(!runResult2.published.some((p) => p.id === art2.id), 'Future article is NOT published by scheduler');

    const freshArt2 = await prisma.article.findUnique({ where: { id: art2.id } });
    assert(freshArt2.status === 'SCHEDULED', 'Future article remains in SCHEDULED status');
    assert(freshArt2.publishedRevisionId === null, 'Future article publishedRevisionId remains null');

    // -------------------------------------------------------------
    // Test 3: Rescheduling Before Execution Prevents Stale Publication
    // -------------------------------------------------------------
    console.log('\n[Test 3: Rescheduling Before Execution Prevents Stale Publication]');
    const art3 = await createApprovedArticle('Reschedule');
    // Initially set to past
    await prisma.article.update({
      where: { id: art3.id },
      data: { status: 'SCHEDULED', publishAt: pastTime, scheduleSequence: 1 },
    });
    await prisma.articleRevision.updateMany({
      where: { articleId: art3.id },
      data: { status: 'SCHEDULED' },
    });

    // Editor reschedules to future time (increments sequence and changes publishAt)
    const farFuture = new Date(Date.now() + 7200000); // 2 hours future
    const reschedRes = await request(`/api/articles/${art3.id}/schedule`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editorToken}` },
      body: { scheduledAt: farFuture.toISOString() },
    });
    assert(reschedRes.status === 200, 'Rescheduling article responds 200 OK');

    // If a stale worker attempts to publish with the old schedule sequence
    let sequenceError = null;
    try {
      await publishArticle({
        articleId: art3.id,
        user: SYSTEM_ACTOR,
        expectedScheduleSequence: 1, // Stale sequence
      });
    } catch (err) {
      sequenceError = err;
    }
    assert(sequenceError !== null && sequenceError.statusCode === 409, 'Stale publication rejected with 409 Conflict due to sequence mismatch');

    // Normal worker execution ignores it because publishAt is now in the future
    const runResult3 = await processDueScheduledArticles();
    assert(!runResult3.published.some((p) => p.id === art3.id), 'Rescheduled future article skipped by scheduler');

    // -------------------------------------------------------------
    // Test 4: Unpublishing Before Execution Prevents Publication
    // -------------------------------------------------------------
    console.log('\n[Test 4: Unpublishing Before Execution Prevents Publication]');
    const art4 = await createApprovedArticle('Unpublish');
    await prisma.article.update({
      where: { id: art4.id },
      data: { status: 'SCHEDULED', publishAt: pastTime, scheduleSequence: 1 },
    });
    await prisma.articleRevision.updateMany({
      where: { articleId: art4.id },
      data: { status: 'SCHEDULED' },
    });

    // Editor unpublishes / cancels schedule
    const unpubRes = await request(`/api/articles/${art4.id}/unpublish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editorToken}` },
      body: { reason: 'Canceling schedule for additional editorial review' },
    });
    assert(unpubRes.status === 200, 'Unpublishing scheduled article responds 200 OK');

    const runResult4 = await processDueScheduledArticles();
    assert(!runResult4.published.some((p) => p.id === art4.id), 'Unpublished article not published by worker');

    const freshArt4 = await prisma.article.findUnique({ where: { id: art4.id } });
    assert(freshArt4.status === 'APPROVED', 'Article remains in APPROVED state after unpublish');

    // -------------------------------------------------------------
    // Test 5: Idempotency & Duplicate Worker Runs
    // -------------------------------------------------------------
    console.log('\n[Test 5: Idempotency Across Multiple Runs]');
    const art5 = await createApprovedArticle('Idempotency');
    await prisma.article.update({
      where: { id: art5.id },
      data: { status: 'SCHEDULED', publishAt: pastTime, scheduleSequence: 1 },
    });
    await prisma.articleRevision.updateMany({
      where: { articleId: art5.id },
      data: { status: 'SCHEDULED' },
    });

    const runA = await processDueScheduledArticles();
    assert(runA.published.some((p) => p.id === art5.id), 'Run A publishes article successfully');

    const runB = await processDueScheduledArticles();
    assert(!runB.published.some((p) => p.id === art5.id), 'Run B does not re-publish already published article');

    const eventsCount = await prisma.timelineEvent.count({
      where: { articleId: art5.id, newStatus: 'PUBLISHED' },
    });
    assert(eventsCount === 1, 'Exactly one PUBLISHED timeline event recorded (no duplicate events)');

    // -------------------------------------------------------------
    // Test 6: Concurrent Workers (Race Condition Safety)
    // -------------------------------------------------------------
    console.log('\n[Test 6: Concurrent Workers Protection]');
    const art6 = await createApprovedArticle('Concurrency');
    await prisma.article.update({
      where: { id: art6.id },
      data: { status: 'SCHEDULED', publishAt: pastTime, scheduleSequence: 1 },
    });
    await prisma.articleRevision.updateMany({
      where: { articleId: art6.id },
      data: { status: 'SCHEDULED' },
    });

    // Run two worker cycles concurrently
    const [c1, c2] = await Promise.all([
      processDueScheduledArticles(),
      processDueScheduledArticles(),
    ]);

    const totalPub = (c1.published.some((p) => p.id === art6.id) ? 1 : 0) +
                     (c2.published.some((p) => p.id === art6.id) ? 1 : 0);
    assert(totalPub === 1, 'Exactly one concurrent worker successfully published the article');

    const art6Events = await prisma.timelineEvent.count({
      where: { articleId: art6.id, newStatus: 'PUBLISHED' },
    });
    assert(art6Events === 1, 'Concurrency did not produce duplicate timeline records');

    // -------------------------------------------------------------
    // Test 7: Correct Approved Revision Selection
    // -------------------------------------------------------------
    console.log('\n[Test 7: Correct Revision Selection]');
    const art7 = await createApprovedArticle('RevisionSelection');
    // art7 has Revision #1 (APPROVED)
    const rev1 = await prisma.articleRevision.findFirst({
      where: { articleId: art7.id, revisionNumber: 1 },
    });

    // Schedule Revision #1
    await prisma.article.update({
      where: { id: art7.id },
      data: { status: 'SCHEDULED', publishAt: pastTime, scheduleSequence: 1 },
    });
    await prisma.articleRevision.update({
      where: { id: rev1.id },
      data: { status: 'SCHEDULED' },
    });

    // Now writer opens Revision #2 in DRAFT status
    const openRevRes = await request(`/api/articles/${art7.id}/revisions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${writerToken}` },
      body: { title: 'Draft Revision 2 (Unapproved)', body: 'Work in progress draft content that must not be published live.' },
    });
    assert(openRevRes.status === 201, 'Writer opened Revision #2 in draft status');

    // Execute scheduler
    const runResult7 = await processDueScheduledArticles();
    assert(runResult7.published.some((p) => p.id === art7.id), 'Article published by scheduler');

    const freshArt7 = await prisma.article.findUnique({
      where: { id: art7.id },
      include: { revisions: { orderBy: { revisionNumber: 'asc' } } },
    });

    assert(freshArt7.publishedRevisionId === rev1.id, 'publishedRevisionId points strictly to Revision #1 (the approved/scheduled revision)');
    const freshRev1 = freshArt7.revisions.find((r) => r.revisionNumber === 1);
    const freshRev2 = freshArt7.revisions.find((r) => r.revisionNumber === 2);
    assert(freshRev1?.status === 'PUBLISHED', 'Revision #1 status transitioned to PUBLISHED');
    assert(freshRev2?.status === 'DRAFT', 'Revision #2 remained in DRAFT status (unapproved revision protected)');

    // -------------------------------------------------------------
    // Test 8: Timeline Immutability Enforced
    // -------------------------------------------------------------
    console.log('\n[Test 8: Audit Timeline Immutability for Automated Publication]');
    const autoEvent = await prisma.timelineEvent.findFirst({
      where: { articleId: art1.id, newStatus: 'PUBLISHED' },
    });
    assert(Boolean(autoEvent), 'Retrieved automated timeline event');

    let deleteBlocked = false;
    try {
      await prisma.timelineEvent.delete({ where: { id: autoEvent.id } });
    } catch (err) {
      deleteBlocked = err.message.includes('strictly immutable') || err.message.includes('trg_timeline_immutable') || err.message.includes('P0001');
    }
    assert(deleteBlocked, 'Database engine trigger trg_timeline_immutable prevents deletion of automated timeline events');

    // -------------------------------------------------------------
    // Test 9: Transaction Rollback on Error
    // -------------------------------------------------------------
    console.log('\n[Test 9: Transaction Rollback on Failure]');
    const art9 = await createApprovedArticle('Rollback');
    const beforeAttempt = await prisma.article.findUnique({ where: { id: art9.id } });
    const initialVersion = beforeAttempt.version;

    let authFailed = false;
    try {
      await publishArticle({
        articleId: art9.id,
        user: { role: 'WRITER', name: 'Unauthorized Writer' }, // Writer cannot publish
      });
    } catch (err) {
      authFailed = true;
    }
    assert(authFailed, 'Unauthorized publish attempt rejected');

    const freshArt9 = await prisma.article.findUnique({ where: { id: art9.id } });
    assert(freshArt9.status === beforeAttempt.status, 'Article status remained unchanged after rejected call');
    assert(freshArt9.version === initialVersion, 'Article version remained unchanged after rejected call');

    // Transaction atomicity: mid-flight failure rolls back status modification
    try {
      await prisma.$transaction(async (tx) => {
        await tx.article.update({
          where: { id: art9.id, version: initialVersion },
          data: { status: 'PUBLISHED', version: { increment: 1 } },
        });
        throw new Error('Simulated atomic failure during publication pipeline');
      });
    } catch (_) {}

    const postTxArt9 = await prisma.article.findUnique({ where: { id: art9.id } });
    assert(postTxArt9.status === 'APPROVED', 'Transaction rollback preserved article APPROVED status');
    assert(postTxArt9.version === initialVersion, 'Transaction rollback preserved original article version');


    // -------------------------------------------------------------
    // Test 10: Authenticated HTTP Cron Endpoint Security & Execution
    // -------------------------------------------------------------
    console.log('\n[Test 10: Authenticated HTTP Cron Endpoint]');
    // 1. Missing credentials
    const noSecretRes = await request('/api/internal/cron/publish', { method: 'POST' });
    assert(noSecretRes.status === 401, 'POST /api/internal/cron/publish without secret returns 401 Unauthorized');
    assert(noSecretRes.data?.error?.includes('Unauthorized'), 'Returns clear unauthorized error message');

    // 2. Invalid secret
    const badSecretRes = await request('/api/internal/cron/publish', {
      method: 'POST',
      headers: { 'x-cron-secret': 'wrong-secret-token-attempt' },
    });
    assert(badSecretRes.status === 401, 'POST /api/internal/cron/publish with invalid secret returns 401 Unauthorized');

    // 3. Valid x-cron-secret header
    const validHeaderRes = await request('/api/internal/cron/publish', {
      method: 'POST',
      headers: { 'x-cron-secret': config.cronSecret },
      body: { batchSize: 10 },
    });
    assert(validHeaderRes.status === 200, 'POST /api/internal/cron/publish with x-cron-secret returns 200 OK');
    assert(validHeaderRes.data?.success === true, 'Response payload reports success: true');
    assert(typeof validHeaderRes.data?.data?.processedCount === 'number', 'Response payload includes processedCount');

    // 4. Valid Authorization: Bearer <secret>
    const validBearerRes = await request('/api/internal/cron/publish', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.cronSecret}` },
    });
    assert(validBearerRes.status === 200, 'POST /api/internal/cron/publish with Bearer secret returns 200 OK');

    // 5. GET /api/internal/cron/status
    const statusRes = await request('/api/internal/cron/status', {
      headers: { 'x-cron-secret': config.cronSecret },
    });
    assert(statusRes.status === 200, 'GET /api/internal/cron/status returns 200 OK');
    assert(typeof statusRes.data?.data?.isRunning === 'boolean', 'Status endpoint returns scheduler isRunning boolean');

    // 6. Cron secret is never exposed in responses or headers
    const resString = JSON.stringify(validHeaderRes.data) + JSON.stringify(statusRes.data);
    assert(!resString.includes(config.cronSecret), 'Cron secret is strictly never leaked in JSON responses');

  } catch (error) {
    console.error('Fatal test runner error:', error);
    assert(false, 'Test suite execution completed without fatal unhandled error', error.message);
  } finally {
    // Cleanup created test articles
    try {
      for (const id of createdArticleIds) {
        // Timeline events cannot be deleted due to immutability trigger, but we leave test articles
        // or archive them if needed. We don't delete to avoid trigger errors.
      }
    } catch (_) {}

    if (server) {
      server.close();
    }
  }

  console.log('\n====================================================');
  const passed = testResults.filter((r) => r.passed).length;
  const failed = testResults.filter((r) => !r.passed).length;
  console.log(`SCHEDULED PUBLISHER RESULTS: ${passed}/${testResults.length} checks passed.`);
  if (failed > 0) {
    console.log(`❌ ${failed} checks FAILED.`);
    process.exit(1);
  } else {
    console.log(`🎉 ALL ${passed} CHECKS PASSED PERFECTLY.`);
  }
}

runTests();
