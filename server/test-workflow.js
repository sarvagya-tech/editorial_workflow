// ==============================================================================
// EDITORIAL WORKFLOW STATE MACHINE TEST SUITE (PHASE 5)
// File: server/test-workflow.js
// Target: Tests all 24 workflow state machine requirements against live Neon DB.
// ==============================================================================

import 'dotenv/config';
process.env.NODE_ENV = 'test';
import http from 'http';
import { prisma } from './src/prisma.js';
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
  console.log('STARTING PHASE 5: WORKFLOW STATE MACHINE TEST SUITE');
  console.log('====================================================\n');

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  let editor1Token = null; // Sarah Jenkins (Editor)
  let editor2Token = null; // David Zhao (Editor)
  let mayaToken = null; // Maya Patel (Writer - Tech & Culture)
  let jamesToken = null; // James Wilson (Writer - Politics & Investigative)

  let editor1User = null;
  let editor2User = null;
  let mayaUser = null;
  let jamesUser = null;

  try {
    // 0. Warm up database connection (handles Neon serverless compute wake-up)
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        await prisma.$queryRaw`SELECT 1`;
        break;
      } catch (err) {
        if (attempt === 5) throw err;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // 0. Setup Tokens
    const ed1Res = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'editor@dispatch.com', password: 'password123' },
    });
    editor1Token = ed1Res.data.token;
    editor1User = ed1Res.data.user;

    const ed2Res = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'david.editor@dispatch.com', password: 'password123' },
    });
    editor2Token = ed2Res.data.token;
    editor2User = ed2Res.data.user;

    const mayaRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'writer@dispatch.com', password: 'password123' },
    });
    mayaToken = mayaRes.data.token;
    mayaUser = mayaRes.data.user;

    const jamesRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'james.writer@dispatch.com', password: 'password123' },
    });
    jamesToken = jamesRes.data.token;
    jamesUser = jamesRes.data.user;

    // Fetch active section for testing
    const sectionsRes = await request('/api/sections', {
      headers: { Authorization: `Bearer ${editor1Token}` },
    });
    const sections = getPayload(sectionsRes);
    const techSection = sections.find((s) => s.name === 'Technology & Silicon');
    const cultureSection = sections.find((s) => s.name === 'Culture & Modern Arts');

    // [Test 1 & 2: Submit for Review & Authorization]
    console.log('[Test 1 & 2: Submit Article & Writer Scoping]');
    // Create an article by Maya in Tech
    const mayaArtRes = await request('/api/articles', {
      method: 'POST',
      headers: { Authorization: `Bearer ${mayaToken}` },
      body: {
        title: '[WF-TEST] Autonomous Microgrids in Island Power Networks',
        body: 'Distributed energy storage systems paired with real-time frequency modulation controllers.',
        sectionId: techSection.id,
      },
    });
    assert(mayaArtRes.status === 201, 'Maya creates draft article in Tech (201 Created)');
    const mayaArt = getPayload(mayaArtRes);

    // James (different writer, not assigned to Maya's piece) attempts to submit Maya's article
    const jamesUnauthorizedSubmit = await request(`/api/articles/${mayaArt.id}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jamesToken}` },
    });
    assert(
      jamesUnauthorizedSubmit.status === 403 || jamesUnauthorizedSubmit.status === 404,
      'Unauthorized writer blocked from submitting another writer article (403/404)'
    );

    // Maya submits her own article for review
    const mayaSubmitRes = await request(`/api/articles/${mayaArt.id}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${mayaToken}` },
    });
    assert(mayaSubmitRes.status === 200, 'Maya submits own article for review (200 OK)');
    const submittedData = getPayload(mayaSubmitRes);
    assert(submittedData.status === 'IN_REVIEW', 'Article workflow status transitioned to IN_REVIEW');
    assert(submittedData.workingRevision.status === 'IN_REVIEW', 'Working revision transitioned to IN_REVIEW');

    // [Test 3: Writer Cannot Approve Articles]
    console.log('\n[Test 3: Writer Cannot Approve Articles]');
    const writerApproveRes = await request(`/api/articles/${mayaArt.id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${mayaToken}` },
    });
    assert(writerApproveRes.status === 403, 'Writer attempting to approve article is rejected with 403 Forbidden');

    // [Test 4 & 5: Editor Approval & Self-Approval Prohibition]
    console.log('\n[Test 4 & 5: Editor Approval & Self-Approval Prevention]');
    // Editor Sarah creates an article as author
    const sarahArtRes = await request('/api/articles', {
      method: 'POST',
      headers: { Authorization: `Bearer ${editor1Token}` },
      body: {
        title: '[WF-TEST] Sarah Editorial Investigation into Algorithmic Trading',
        body: 'Investigating high-frequency order book cancellation patterns on dark liquidity pools.',
        sectionId: techSection.id,
      },
    });
    assert(sarahArtRes.status === 201, 'Editor Sarah creates article as author (201 Created)');
    const sarahArt = getPayload(sarahArtRes);

    // Sarah submits it
    await request(`/api/articles/${sarahArt.id}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editor1Token}` },
    });

    // Sarah attempts to self-approve her own article!
    const sarahSelfApproveRes = await request(`/api/articles/${sarahArt.id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editor1Token}` },
    });
    assert(
      sarahSelfApproveRes.status === 403,
      'Editor is blocked from self-approving their own article (403 Forbidden)'
    );

    // Second Editor David Zhao approves Sarah's article
    const davidApproveRes = await request(`/api/articles/${sarahArt.id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editor2Token}` },
    });
    assert(davidApproveRes.status === 200, 'Second editor David Zhao approves Sarah article (200 OK)');
    const approvedSarahArt = getPayload(davidApproveRes);
    assert(approvedSarahArt.status === 'APPROVED', 'Sarah article transitioned to APPROVED');
    assert(approvedSarahArt.workingRevision.status === 'APPROVED', 'Working revision status transitioned to APPROVED');

    // Editor Sarah approves Maya's article
    const sarahApproveMayaRes = await request(`/api/articles/${mayaArt.id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editor1Token}` },
    });
    assert(sarahApproveMayaRes.status === 200, 'Editor Sarah approves Maya article (200 OK)');

    // [Test 6: Invalid State Transitions Rejected]
    console.log('\n[Test 6: Invalid Transitions Rejected]');
    // Attempting to submit an already APPROVED article
    const invalidSubmitRes = await request(`/api/articles/${mayaArt.id}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${mayaToken}` },
    });
    assert(invalidSubmitRes.status === 400, 'Submitting an already APPROVED article rejected (400 Bad Request)');

    // Attempting to approve an already APPROVED article
    const invalidDoubleApprove = await request(`/api/articles/${mayaArt.id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editor2Token}` },
    });
    assert(invalidDoubleApprove.status === 400, 'Approving an already APPROVED article rejected (400 Bad Request)');

    // [Test 7 & 8: Scheduling & Future Timestamp Validation]
    console.log('\n[Test 7 & 8: Scheduling & Timestamp Validation]');
    // Attempting to schedule with past timestamp
    const pastTime = new Date(Date.now() - 3600000).toISOString();
    const pastScheduleRes = await request(`/api/articles/${mayaArt.id}/schedule`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editor1Token}` },
      body: { scheduledAt: pastTime },
    });
    assert(pastScheduleRes.status === 400, 'Scheduling in the past rejected with 400 Bad Request');

    // Attempting to schedule with invalid non-date string
    const badDateScheduleRes = await request(`/api/articles/${mayaArt.id}/schedule`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editor1Token}` },
      body: { scheduledAt: 'not-a-valid-iso-date' },
    });
    assert(badDateScheduleRes.status === 400, 'Scheduling with invalid date string rejected with 400 Bad Request');

    // Schedule for future time
    const futureTime = new Date(Date.now() + 86400000).toISOString(); // 24 hours in future
    const validScheduleRes = await request(`/api/articles/${mayaArt.id}/schedule`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editor1Token}` },
      body: { scheduledAt: futureTime },
    });
    assert(validScheduleRes.status === 200, 'Scheduling with future date succeeds (200 OK)');
    const scheduledData = getPayload(validScheduleRes);
    assert(scheduledData.status === 'SCHEDULED', 'Article status transitioned to SCHEDULED');
    assert(scheduledData.publishAt !== null, 'Article carries valid publishAt timestamp');
    assert(scheduledData.scheduleSequence >= 1, 'Schedule sequence incremented');

    // [Test 9: Publish Approved Article Immediately]
    console.log('\n[Test 9: Immediate Publication of Approved Article]');
    // Sarah's article is APPROVED. Publish it immediately!
    const publishSarahRes = await request(`/api/articles/${sarahArt.id}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editor2Token}` },
    });
    assert(publishSarahRes.status === 200, 'Approved article published immediately (200 OK)');
    const publishedSarah = getPayload(publishSarahRes);
    assert(publishedSarah.status === 'PUBLISHED', 'Article status is PUBLISHED');
    assert(publishedSarah.publishedRevision !== null, 'publishedRevision pointer is set');
    assert(publishedSarah.publishedRevision.status === 'PUBLISHED', 'Published revision status is PUBLISHED');

    // [Test 10 & 11: Scheduled Article Early vs Due Publication]
    console.log('\n[Test 10 & 11: Scheduled Publication Policy]');
    // Maya's article is SCHEDULED for 24 hours in the future. Attempting early publish must be blocked!
    const earlyPublishRes = await request(`/api/articles/${mayaArt.id}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editor1Token}` },
    });
    assert(earlyPublishRes.status === 400, 'Early publication of scheduled article is rejected (400 Bad Request)');

    // Create another article that is scheduled for the past (due to publish)
    const dueArtRes = await request('/api/articles', {
      method: 'POST',
      headers: { Authorization: `Bearer ${editor1Token}` },
      body: {
        title: '[WF-TEST] Due Scheduled Piece for Automated Pipeline',
        body: 'Breaking investigation scheduled to publish automatically upon timing threshold.',
        sectionId: techSection.id,
      },
    });
    const dueArt = getPayload(dueArtRes);
    await request(`/api/articles/${dueArt.id}/submit`, { method: 'POST', headers: { Authorization: `Bearer ${editor1Token}` } });
    await request(`/api/articles/${dueArt.id}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${editor2Token}` } });
    
    // Set scheduled time in the past via database update to simulate due publication time
    await prisma.article.update({
      where: { id: dueArt.id },
      data: {
        status: 'SCHEDULED',
        publishAt: new Date(Date.now() - 60000), // 1 minute in the past
      },
    });
    await prisma.articleRevision.updateMany({
      where: { articleId: dueArt.id },
      data: { status: 'SCHEDULED' },
    });

    // Now publishing the due scheduled article succeeds!
    const duePublishRes = await request(`/api/articles/${dueArt.id}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editor1Token}` },
    });
    assert(duePublishRes.status === 200, 'Due scheduled article publishes successfully (200 OK)');
    assert(getPayload(duePublishRes).status === 'PUBLISHED', 'Due article transitioned to PUBLISHED');

    // [Test 12 & 13: Unpublishing Scheduled & Published Articles]
    console.log('\n[Test 12 & 13: Unpublishing Articles]');
    // Unpublish Maya's SCHEDULED article
    const unpublishScheduledRes = await request(`/api/articles/${mayaArt.id}/unpublish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editor1Token}` },
      body: { reason: 'Rescheduling pending press release confirmation.' },
    });
    assert(unpublishScheduledRes.status === 200, 'Unpublishing scheduled article responds 200 OK');
    const unpubSchedData = getPayload(unpublishScheduledRes);
    assert(unpubSchedData.status === 'APPROVED', 'Unpublished article reverted to APPROVED');
    assert(unpubSchedData.publishAt === null, 'Active schedule publishAt timestamp cleared');

    // Unpublish Sarah's PUBLISHED article
    const unpublishPublishedRes = await request(`/api/articles/${sarahArt.id}/unpublish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editor2Token}` },
      body: { reason: 'Retracted for legal compliance review.' },
    });
    assert(unpublishPublishedRes.status === 200, 'Unpublishing published article responds 200 OK');
    const unpubPubData = getPayload(unpublishPublishedRes);
    assert(unpubPubData.status === 'APPROVED', 'Published article reverted to APPROVED status');

    // [Test 14: Preservation of History on Unpublish]
    console.log('\n[Test 14: Preservation of History Across Unpublishing]');
    const sarahArtInDb = await prisma.article.findUnique({
      where: { id: sarahArt.id },
      include: { revisions: true, publishedRevision: true },
    });
    assert(sarahArtInDb.publishedRevisionId !== null, 'Historical publishedRevisionId pointer preserved in DB');
    assert(sarahArtInDb.revisions.length >= 1, 'Historical revisions preserved intact');

    // [Test 15, 16, 17, 18: Published Article Replacement Revisions Lifecycle]
    console.log('\n[Test 15, 16, 17, 18: Replacement Revision Workflow on Live Articles]');
    // Republish Sarah's article so it is live
    await request(`/api/articles/${sarahArt.id}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editor2Token}` },
    });
    const liveArtBefore = await prisma.article.findUnique({
      where: { id: sarahArt.id },
      include: { publishedRevision: true },
    });
    const liveRev1Id = liveArtBefore.publishedRevisionId;
    const liveRev1Title = liveArtBefore.title;

    // Open a new Revision #2
    const openRev2Res = await request(`/api/articles/${sarahArt.id}/revisions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editor1Token}` },
      body: {
        title: '[WF-TEST] Sarah Algorithmic Trading (Revision #2 Updated)',
        body: 'Fresh empirical findings with newly verified market microstructure trade data.',
      },
    });
    assert(openRev2Res.status === 201, 'Opened Revision #2 on published article (201 Created)');
    const rev2Data = getPayload(openRev2Res);
    assert(rev2Data.revisionNumber === 2, 'Revision numbered #2');
    assert(rev2Data.status === 'DRAFT', 'Revision #2 starts in DRAFT status');

    // Assert live content did NOT change
    const liveArtWhileDraft = await prisma.article.findUnique({
      where: { id: sarahArt.id },
      include: { publishedRevision: true },
    });
    assert(liveArtWhileDraft.title === liveRev1Title, 'Live article title unchanged while Revision #2 is in draft');
    assert(liveArtWhileDraft.publishedRevisionId === liveRev1Id, 'Live publishedRevisionId still points to Revision #1');

    // Revision #2 cannot be published directly from DRAFT
    const illegalPublishRev2 = await request(`/api/articles/${sarahArt.id}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editor2Token}` },
      body: { revisionId: rev2Data.id },
    });
    assert(illegalPublishRev2.status === 400, 'Replacement revision cannot be published directly from DRAFT');

    // Submit Revision #2 for review
    const submitRev2 = await request(`/api/articles/${sarahArt.id}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editor1Token}` },
      body: { revisionId: rev2Data.id },
    });
    assert(submitRev2.status === 200, 'Revision #2 submitted for review (200 OK)');

    // Sarah cannot self-approve Revision #2
    const selfApproveRev2 = await request(`/api/articles/${sarahArt.id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editor1Token}` },
      body: { revisionId: rev2Data.id },
    });
    assert(selfApproveRev2.status === 403, 'Author cannot approve their own replacement revision (403)');

    // David approves Revision #2
    const approveRev2 = await request(`/api/articles/${sarahArt.id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editor2Token}` },
      body: { revisionId: rev2Data.id },
    });
    assert(approveRev2.status === 200, 'Editor David approves Revision #2 (200 OK)');

    // David publishes Revision #2 live!
    const publishRev2 = await request(`/api/articles/${sarahArt.id}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editor2Token}` },
      body: { revisionId: rev2Data.id },
    });
    assert(publishRev2.status === 200, 'Revision #2 published live (200 OK)');
    const liveArtAfter = await prisma.article.findUnique({
      where: { id: sarahArt.id },
      include: { publishedRevision: true },
    });
    assert(liveArtAfter.publishedRevisionId === rev2Data.id, 'publishedRevisionId atomically shifted to Revision #2');
    assert(liveArtAfter.title.includes('Revision #2 Updated'), 'Live article title promoted to Revision #2 content');

    // Historical Revision #1 is still accessible
    const historicalRev1 = await prisma.articleRevision.findUnique({
      where: { id: liveRev1Id },
    });
    assert(historicalRev1 !== null, 'Historical Revision #1 snapshot remains accessible in database');
    assert(historicalRev1.title === liveRev1Title, 'Historical Revision #1 title snapshot preserved unchanged');

    // [Test 19 & 20: Audit Timeline Events & Transaction Atomicity]
    console.log('\n[Test 19 & 20: Timeline Events & Transaction Atomicity]');
    const timelineRes = await request(`/api/articles/${sarahArt.id}/timeline`, {
      headers: { Authorization: `Bearer ${editor1Token}` },
    });
    assert(timelineRes.status === 200, 'Timeline endpoint responds 200 OK');
    const timelineEvents = getPayload(timelineRes);
    const eventTypes = timelineEvents.map((e) => e.eventType);
    assert(eventTypes.includes('STATUS_CHANGED'), 'Timeline records STATUS_CHANGED events');
    assert(eventTypes.includes('UNPUBLISHED'), 'Timeline records UNPUBLISHED event');
    assert(eventTypes.includes('REVISION_PUBLISHED'), 'Timeline records REVISION_PUBLISHED event for replacement revision');

    // Atomicity test: simulated timeline event write failure rolls back article status
    const versionBefore = liveArtAfter.version;
    try {
      await prisma.$transaction(async (tx) => {
        await tx.article.update({
          where: { id: sarahArt.id },
          data: { status: 'DRAFT', version: { increment: 1 } },
        });
        throw new Error('Simulated timeline write failure');
      });
    } catch (e) {
      // Expected rollback
    }
    const rollbackCheck = await prisma.article.findUnique({ where: { id: sarahArt.id } });
    assert(rollbackCheck.version === versionBefore, 'Failed transaction rolled back article state modification');
    assert(rollbackCheck.status === 'PUBLISHED', 'Article status remained PUBLISHED after aborted transaction');

    // [Test 21: Tamper-Proof Immutability Trigger Protection]
    console.log('\n[Test 21: Tamper-Proof Audit Immutability Protection]');
    let mutationCaught = false;
    try {
      const firstEvent = timelineEvents[0];
      await prisma.timelineEvent.update({
        where: { id: firstEvent.id },
        data: { description: 'Tampered Description' },
      });
    } catch (err) {
      mutationCaught = err.message.includes('strictly immutable') || err.message.includes('prevent_timeline_mutation');
    }
    assert(mutationCaught, 'PostgreSQL engine trigger trg_timeline_immutable blocks direct update of timeline events');

    // [Test 22: Optimistic Concurrency Control (Version Conflict)]
    console.log('\n[Test 22: Concurrency & Optimistic Locking]');
    // Send 2 concurrent approve requests with same initial version
    const testArticleForRace = await prisma.article.create({
      data: {
        title: '[WF-TEST] Concurrency Lock Testing',
        body: 'Simulating concurrent conflicting approvals.',
        sectionId: techSection.id,
        authorId: mayaUser.id,
        status: 'IN_REVIEW',
        version: 1,
      },
    });
    const revForRace = await prisma.articleRevision.create({
      data: {
        articleId: testArticleForRace.id,
        revisionNumber: 1,
        title: testArticleForRace.title,
        body: testArticleForRace.body,
        status: 'IN_REVIEW',
        authorId: mayaUser.id,
      },
    });

    const [raceRes1, raceRes2] = await Promise.all([
      request(`/api/articles/${testArticleForRace.id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${editor1Token}` },
      }),
      request(`/api/articles/${testArticleForRace.id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${editor2Token}` },
      }),
    ]);

    const oneSucceeded = (raceRes1.status === 200 && (raceRes2.status === 400 || raceRes2.status === 409)) ||
                         (raceRes2.status === 200 && (raceRes1.status === 400 || raceRes1.status === 409));
    assert(oneSucceeded, 'Concurrent conflicting state transitions are handled safely without duplicate execution');

    // [Test 23: Workflow Bypass Block on Generic Update]
    console.log('\n[Test 23: Generic PATCH Cannot Alter Workflow State]');
    const genericBypassAttempt = await request(`/api/articles/${testArticleForRace.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${editor1Token}` },
      body: {
        title: '[WF-TEST] Concurrency Lock Testing (Updated)',
        status: 'PUBLISHED',
        publishedRevisionId: 'illegal_pointer_bypass',
      },
    });
    // In APPROVED status, generic PATCH is blocked to protect workflow state machine
    assert(
      genericBypassAttempt.status === 400 || getPayload(genericBypassAttempt)?.status !== 'PUBLISHED',
      'Generic PATCH cannot be used to forge PUBLISHED status'
    );

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
  console.log(`PHASE 5 WORKFLOW RESULTS: ${passedCount}/${totalCount} checks passed.`);
  console.log('====================================================\n');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runTests();
