import 'dotenv/config';
process.env.NODE_ENV = 'test';
import http from 'http';
import { prisma } from '../src/prisma.js';
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
  console.log('STARTING PHASE 7: BULK WORKFLOW OPERATIONS TEST SUITE');
  console.log('====================================================\n');

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  let editorToken = null;
  let writerToken = null;
  let editorUser = null;
  let writerUser = null;

  // Track created test article IDs for isolated cleanup
  const createdTestArticleIds = [];

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

    // Login accounts
    const edLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'editor@dispatch.com', password: 'password123' },
    });
    editorToken = edLogin.data.token;
    editorUser = edLogin.data.user;

    const wrLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'writer@dispatch.com', password: 'password123' },
    });
    writerToken = wrLogin.data.token;
    writerUser = wrLogin.data.user;

    // Get an active section for creating test articles
    const sectionsRes = await request('/api/sections', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    const sections = getPayload(sectionsRes);
    const techSection = sections.find((s) => s.name === 'Technology & Silicon') || sections[0];

    // Helper to create an isolated test article
    async function createTestArticle(title, initialStatus = 'DRAFT') {
      const art = await prisma.article.create({
        data: {
          title,
          body: `Detailed investigative body copy for ${title}. Fulfills minimum length requirement.`,
          sectionId: techSection.id,
          authorId: writerUser.id,
          status: initialStatus,
          publishAt: initialStatus === 'SCHEDULED' ? new Date(Date.now() + 86400000) : null,
          publishedAt: initialStatus === 'PUBLISHED' ? new Date() : null,
        },
      });
      createdTestArticleIds.push(art.id);

      const rev = await prisma.articleRevision.create({
        data: {
          articleId: art.id,
          revisionNumber: 1,
          title: art.title,
          body: art.body,
          status: initialStatus,
          authorId: writerUser.id,
          publishedAt: initialStatus === 'PUBLISHED' ? new Date() : null,
        },
      });

      if (initialStatus === 'PUBLISHED') {
        await prisma.article.update({
          where: { id: art.id },
          data: { publishedRevisionId: rev.id },
        });
      }

      await prisma.timelineEvent.create({
        data: {
          articleId: art.id,
          actorId: writerUser.id,
          actorName: writerUser.name,
          eventType: 'CREATED',
          newStatus: initialStatus,
          description: `Test article initiated in ${initialStatus} status`,
        },
      });

      return { article: art, revision: rev };
    }

    // ----------------------------------------------------
    // [Test Group 1: Request Validation & Authorization]
    // ----------------------------------------------------
    console.log('[Test Group 1: Request Validation & Authorization]');

    // 1. Writer cannot execute bulk schedule
    const writerSchedRes = await request('/api/articles/bulk/schedule', {
      method: 'POST',
      headers: { Authorization: `Bearer ${writerToken}` },
      body: {
        articleIds: ['some-id'],
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      },
    });
    assert(writerSchedRes.status === 403, 'Writer executing bulk schedule rejected with 403 Forbidden');

    // 2. Writer cannot execute bulk unpublish
    const writerUnpubRes = await request('/api/articles/bulk/unpublish', {
      method: 'POST',
      headers: { Authorization: `Bearer ${writerToken}` },
      body: { articleIds: ['some-id'] },
    });
    assert(writerUnpubRes.status === 403, 'Writer executing bulk unpublish rejected with 403 Forbidden');

    // 3. Unauthenticated requests rejected
    const unauthRes = await request('/api/articles/bulk/schedule', {
      method: 'POST',
      body: { articleIds: ['some-id'] },
    });
    assert(unauthRes.status === 401, 'Unauthenticated bulk request rejected with 401 Unauthorized');

    // 4. Empty articleIds array rejected
    const emptySchedRes = await request('/api/articles/bulk/schedule', {
      method: 'POST',
      headers: { Authorization: `Bearer ${editorToken}` },
      body: {
        articleIds: [],
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      },
    });
    assert(emptySchedRes.status === 400, 'Empty articleIds array rejected with 400 Bad Request');

    // 5. Non-array articleIds rejected
    const nonArrayRes = await request('/api/articles/bulk/schedule', {
      method: 'POST',
      headers: { Authorization: `Bearer ${editorToken}` },
      body: {
        articleIds: 'not-an-array',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      },
    });
    assert(nonArrayRes.status === 400, 'Non-array articleIds rejected with 400 Bad Request');

    // 6. Duplicate article IDs in request rejected
    const dupRes = await request('/api/articles/bulk/schedule', {
      method: 'POST',
      headers: { Authorization: `Bearer ${editorToken}` },
      body: {
        articleIds: ['art-dup-1', 'art-dup-2', 'art-dup-1'],
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      },
    });
    assert(dupRes.status === 400, 'Duplicate article IDs rejected with 400 Bad Request');

    // 7. Missing or invalid scheduledAt date rejected
    const missingDateRes = await request('/api/articles/bulk/schedule', {
      method: 'POST',
      headers: { Authorization: `Bearer ${editorToken}` },
      body: {
        articleIds: ['art-1'],
      },
    });
    assert(missingDateRes.status === 400, 'Missing scheduledAt rejected with 400 Bad Request');

    const pastDateRes = await request('/api/articles/bulk/schedule', {
      method: 'POST',
      headers: { Authorization: `Bearer ${editorToken}` },
      body: {
        articleIds: ['art-1'],
        scheduledAt: '2020-01-01T00:00:00.000Z',
      },
    });
    assert(pastDateRes.status === 400, 'Past scheduledAt timestamp rejected with 400 Bad Request');

    // 8. Batch size exceeding maximum (100) rejected
    const oversizedArray = Array.from({ length: 101 }, (_, i) => `art-id-${i}`);
    const oversizedRes = await request('/api/articles/bulk/schedule', {
      method: 'POST',
      headers: { Authorization: `Bearer ${editorToken}` },
      body: {
        articleIds: oversizedArray,
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      },
    });
    assert(oversizedRes.status === 400, 'Batch size exceeding 100 rejected with 400 Bad Request');

    // ----------------------------------------------------
    // [Test Group 2: Bulk Scheduling Operations]
    // ----------------------------------------------------
    console.log('\n[Test Group 2: Bulk Scheduling Operations]');

    // Setup: 2 Approved articles, 1 Draft article, 1 In Review article
    const { article: app1 } = await createTestArticle('Bulk Test Approved Article 1', 'APPROVED');
    const { article: app2 } = await createTestArticle('Bulk Test Approved Article 2', 'APPROVED');
    const { article: dft1 } = await createTestArticle('Bulk Test Draft Article', 'DRAFT');
    const { article: inRev1 } = await createTestArticle('Bulk Test In Review Article', 'IN_REVIEW');
    const nonexistentId = 'nonexistent-article-id-99999';

    const futureSchedule = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    // Mixed batch: 2 valid approved, 1 draft, 1 in-review, 1 nonexistent
    const mixedBatchIds = [app1.id, dft1.id, app2.id, inRev1.id, nonexistentId];

    const bulkSchedRes = await request('/api/articles/bulk/schedule', {
      method: 'POST',
      headers: { Authorization: `Bearer ${editorToken}` },
      body: {
        articleIds: mixedBatchIds,
        scheduledAt: futureSchedule,
      },
    });

    assert(bulkSchedRes.status === 200, 'Bulk schedule with mixed results responds 200 OK');
    const schedBody = bulkSchedRes.data;
    assert(schedBody.success === true, 'Response payload has success: true');
    assert(schedBody.summary.requested === 5, 'Summary requested count matches (5)');
    assert(schedBody.summary.succeeded === 2, 'Summary succeeded count is accurate (2)');
    assert(schedBody.summary.failed === 3, 'Summary failed count is accurate (3)');
    assert(schedBody.results.length === 5, 'Response returns exactly 1 result per requested article');

    // Check individual results
    const rApp1 = schedBody.results.find((r) => r.articleId === app1.id);
    assert(rApp1 && rApp1.success === true, 'Approved article 1 scheduled successfully');
    assert(rApp1.previousStatus === 'APPROVED', 'Approved article 1 reports previousStatus APPROVED');
    assert(rApp1.currentStatus === 'SCHEDULED', 'Approved article 1 reports currentStatus SCHEDULED');

    const rApp2 = schedBody.results.find((r) => r.articleId === app2.id);
    assert(rApp2 && rApp2.success === true, 'Approved article 2 scheduled successfully');

    const rDft = schedBody.results.find((r) => r.articleId === dft1.id);
    assert(rDft && rDft.success === false, 'Draft article correctly rejected from scheduling');
    assert(rDft.reason.includes('DRAFT') && rDft.reason.includes('APPROVED'), 'Draft failure provides descriptive reason');

    const rInRev = schedBody.results.find((r) => r.articleId === inRev1.id);
    assert(rInRev && rInRev.success === false, 'In Review article rejected from scheduling');

    const rNonExistent = schedBody.results.find((r) => r.articleId === nonexistentId);
    assert(rNonExistent && rNonExistent.success === false, 'Nonexistent article rejected safely');
    assert(rNonExistent.reason.includes('not found'), 'Nonexistent article reports not found');

    // Verify DB state of scheduled articles
    const updatedApp1 = await prisma.article.findUnique({ where: { id: app1.id } });
    assert(updatedApp1.status === 'SCHEDULED', 'Database article 1 transitioned to SCHEDULED');
    assert(updatedApp1.publishAt !== null, 'Database article 1 has publishAt populated');

    // Verify timeline events recorded for successes
    const eventsApp1 = await prisma.timelineEvent.findMany({
      where: { articleId: app1.id, eventType: 'SCHEDULED' },
    });
    assert(eventsApp1.length === 1, 'Exactly 1 SCHEDULED timeline event recorded for article 1');
    assert(eventsApp1[0].actorId === editorUser.id, 'Timeline event records acting editor ID');

    // Verify NO timeline events created for failures
    const eventsDft = await prisma.timelineEvent.findMany({
      where: { articleId: dft1.id, eventType: 'SCHEDULED' },
    });
    assert(eventsDft.length === 0, 'No SCHEDULED timeline event created for failed draft article');

    // ----------------------------------------------------
    // [Test Group 3: Replacement Revision Safety]
    // ----------------------------------------------------
    console.log('\n[Test Group 3: Replacement Revision Safety]');

    // Article is PUBLISHED with Revision 1.
    // Revision 2 is opened, submitted, and approved.
    // Scheduling Revision 2 must NOT overwrite the published Revision 1 pointer!
    const { article: liveArt, revision: liveRev1 } = await createTestArticle(
      'Live Published Article With Newer Revision',
      'PUBLISHED'
    );

    // Create Revision 2 in APPROVED status
    const liveRev2 = await prisma.articleRevision.create({
      data: {
        articleId: liveArt.id,
        revisionNumber: 2,
        title: 'Live Article (Revision 2 Approved Updates)',
        body: 'New reporting to replace revision 1 once scheduled time arrives.',
        status: 'APPROVED',
        authorId: writerUser.id,
      },
    });

    const repSchedRes = await request('/api/articles/bulk/schedule', {
      method: 'POST',
      headers: { Authorization: `Bearer ${editorToken}` },
      body: {
        articleIds: [liveArt.id],
        scheduledAt: futureSchedule,
      },
    });

    assert(repSchedRes.status === 200, 'Scheduling replacement revision succeeds (200 OK)');
    assert(repSchedRes.data.summary.succeeded === 1, 'Replacement revision scheduling succeeded');

    const liveArtCheck = await prisma.article.findUnique({ where: { id: liveArt.id } });
    assert(liveArtCheck.status === 'PUBLISHED', 'Live article top-level status remains PUBLISHED');
    assert(
      liveArtCheck.publishedRevisionId === liveRev1.id,
      'Live article publishedRevisionId continues to point to Revision 1 (never prematurely replaced)'
    );

    const checkRev2 = await prisma.articleRevision.findUnique({ where: { id: liveRev2.id } });
    assert(checkRev2.status === 'SCHEDULED', 'Working Revision 2 status transitioned to SCHEDULED');

    // ----------------------------------------------------
    // [Test Group 4: Bulk Unpublishing Operations]
    // ----------------------------------------------------
    console.log('\n[Test Group 4: Bulk Unpublishing Operations]');

    // Setup articles for unpublishing:
    // - 1 PUBLISHED article
    // - 1 SCHEDULED article (app1 is already SCHEDULED from Group 2!)
    // - 1 APPROVED article (app2 was scheduled, let's create a fresh APPROVED article)
    // - 1 DRAFT article
    const { article: pubArt } = await createTestArticle('Bulk Test Published Article', 'PUBLISHED');
    const { article: unpubApp } = await createTestArticle('Bulk Test Approved Only Article', 'APPROVED');

    const unpublishBatchIds = [pubArt.id, app1.id, unpubApp.id, dft1.id];

    const bulkUnpubRes = await request('/api/articles/bulk/unpublish', {
      method: 'POST',
      headers: { Authorization: `Bearer ${editorToken}` },
      body: {
        articleIds: unpublishBatchIds,
        reason: 'Editorial hold pending legal review.',
      },
    });

    assert(bulkUnpubRes.status === 200, 'Bulk unpublish responds 200 OK');
    const unpubBody = bulkUnpubRes.data;
    assert(unpubBody.summary.requested === 4, 'Unpublish summary requested count matches (4)');
    assert(unpubBody.summary.succeeded === 2, 'Unpublish summary succeeded count matches (2: 1 PUBLISHED, 1 SCHEDULED)');
    assert(unpubBody.summary.failed === 2, 'Unpublish summary failed count matches (2: 1 APPROVED, 1 DRAFT)');

    const rPub = unpubBody.results.find((r) => r.articleId === pubArt.id);
    assert(rPub && rPub.success === true, 'Published article successfully unpublished');
    assert(rPub.previousStatus === 'PUBLISHED', 'Published article reports previousStatus PUBLISHED');
    assert(rPub.currentStatus === 'APPROVED', 'Published article reports currentStatus APPROVED');

    const rSched = unpubBody.results.find((r) => r.articleId === app1.id);
    assert(rSched && rSched.success === true, 'Scheduled article successfully unpublished');
    assert(rSched.previousStatus === 'SCHEDULED', 'Scheduled article reports previousStatus SCHEDULED');
    assert(rSched.currentStatus === 'APPROVED', 'Scheduled article reports currentStatus APPROVED');

    const rAppIneligible = unpubBody.results.find((r) => r.articleId === unpubApp.id);
    assert(rAppIneligible && rAppIneligible.success === false, 'Approved article rejected from unpublish');
    assert(
      rAppIneligible.reason.includes('APPROVED') && rAppIneligible.reason.includes('SCHEDULED or PUBLISHED'),
      'Ineligible approved article reports clear rejection reason'
    );

    // Verify DB state after unpublishing
    const checkPubArt = await prisma.article.findUnique({ where: { id: pubArt.id } });
    assert(checkPubArt.status === 'APPROVED', 'Unpublished article transitioned to APPROVED in database');
    assert(checkPubArt.publishAt === null, 'Unpublished article future schedule cleared');

    // Verify UNPUBLISHED timeline events
    const unpubEvents = await prisma.timelineEvent.findMany({
      where: { articleId: pubArt.id, eventType: 'UNPUBLISHED' },
    });
    assert(unpubEvents.length === 1, 'Exactly 1 UNPUBLISHED timeline event recorded');
    assert(
      unpubEvents[0].description.includes('Editorial hold pending legal review.'),
      'Timeline event retains editorial reason string'
    );

    // ----------------------------------------------------
    // [Test Group 5: Idempotency & Retry Safety]
    // ----------------------------------------------------
    console.log('\n[Test Group 5: Idempotency & Retries]');

    // Retrying the unpublish on pubArt (now APPROVED) should fail gracefully
    const retryUnpubRes = await request('/api/articles/bulk/unpublish', {
      method: 'POST',
      headers: { Authorization: `Bearer ${editorToken}` },
      body: {
        articleIds: [pubArt.id],
      },
    });
    assert(retryUnpubRes.status === 200, 'Retried bulk unpublish responds 200 OK');
    assert(retryUnpubRes.data.summary.failed === 1, 'Retried unpublish on already APPROVED article reports failed');
    assert(
      retryUnpubRes.data.results[0].reason.includes('APPROVED'),
      'Retry rejection reason indicates article is already in APPROVED status'
    );

    // Verify NO second timeline event was created
    const retryEvents = await prisma.timelineEvent.findMany({
      where: { articleId: pubArt.id, eventType: 'UNPUBLISHED' },
    });
    assert(retryEvents.length === 1, 'No duplicate UNPUBLISHED timeline event created on retry');

    // ----------------------------------------------------
    // [Test Group 6: Concurrency & Transaction Rollback]
    // ----------------------------------------------------
    console.log('\n[Test Group 6: Concurrency & Atomicity]');

    // Create an article with APPROVED status
    const { article: concArt } = await createTestArticle('Concurrency Test Article', 'APPROVED');

    // Simulate two concurrent bulk schedule operations on the same article
    const concPromises = [
      request('/api/articles/bulk/schedule', {
        method: 'POST',
        headers: { Authorization: `Bearer ${editorToken}` },
        body: {
          articleIds: [concArt.id],
          scheduledAt: futureSchedule,
        },
      }),
      request('/api/articles/bulk/schedule', {
        method: 'POST',
        headers: { Authorization: `Bearer ${editorToken}` },
        body: {
          articleIds: [concArt.id],
          scheduledAt: futureSchedule,
        },
      }),
    ];

    const concResponses = await Promise.all(concPromises);
    const concSuccesses = concResponses.filter(
      (r) => r.status === 200 && r.data?.summary?.succeeded === 1
    );
    const concFailures = concResponses.filter(
      (r) => r.status === 200 && r.data?.summary?.failed === 1
    );

    assert(concSuccesses.length === 1, 'Exactly one concurrent scheduling operation committed');
    assert(concFailures.length === 1, 'Conflicting concurrent scheduling operation failed cleanly without collision');

    // Verify timeline events recorded exactly once
    const concTimelineEvents = await prisma.timelineEvent.findMany({
      where: { articleId: concArt.id, eventType: 'SCHEDULED' },
    });
    assert(concTimelineEvents.length === 1, 'Database timeline has exactly 1 event despite concurrent execution');

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
  console.log(`PHASE 7 BULK WORKFLOW RESULTS: ${passedCount}/${totalCount} checks passed.`);
  console.log('====================================================\n');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
  process.exit(0);
}

runTests();
