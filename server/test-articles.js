// ==============================================================================
// ARTICLE CRUD & REVISION MANAGEMENT TEST SUITE (PHASE 4)
// File: server/test-articles.js
// Target: Tests all 18 Article, Revision, Comment & Timeline requirements against live Neon DB.
// ==============================================================================

process.env.NODE_ENV = 'test';
const { default: app } = await import('./src/index.js');
import http from 'http';
import { prisma } from './src/prisma.js';

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
  console.log('STARTING PHASE 4: ARTICLE & REVISION TEST SUITE');
  console.log('====================================================\n');

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  let editorToken = null;
  let mayaToken = null; // Writer assigned to Tech and Culture
  let jamesToken = null; // Writer assigned to Politics and Investigative
  let mayaUser = null;
  let jamesUser = null;
  let editorUser = null;

  // Track created test article for test suite
  let testCreatedArticleId = null;

  try {
    // 0. Setup Tokens
    const editorRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'editor@dispatch.com', password: 'password123' },
    });
    editorToken = editorRes.data.token;
    editorUser = editorRes.data.user;

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

    // Fetch section IDs for testing
    const sectionsRes = await request('/api/sections?includeArchived=true', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    const sections = getPayload(sectionsRes);
    const techSection = sections.find((s) => s.name === 'Technology & Silicon');
    const cultureSection = sections.find((s) => s.name === 'Culture & Modern Arts');
    const archivedSection = sections.find((s) => s.isArchived);

    // [Test 1: Unauthenticated Requests]
    console.log('[Test 1: Unauthenticated Requests]');
    const unauthGet = await request('/api/articles');
    assert(unauthGet.status === 401, 'Unauthenticated GET /api/articles returns 401');

    const unauthPost = await request('/api/articles', {
      method: 'POST',
      body: { title: 'Unauthorized Story', body: 'This should fail immediately.', sectionId: techSection.id },
    });
    assert(unauthPost.status === 401, 'Unauthenticated POST /api/articles returns 401');

    // [Test 2 & 3: Writer Section Scoping & Access Restrictions]
    console.log('\n[Test 2 & 3: Writer Access Scoping & Non-Disclosure]');
    // Maya is assigned to Tech, Politics, and Investigative, but NOT Culture.
    // Maya lists articles -> should see articles in assigned desks, but NOT Elena's Culture articles
    const mayaArticlesRes = await request('/api/articles', {
      headers: { Authorization: `Bearer ${mayaToken}` },
    });
    assert(mayaArticlesRes.status === 200, 'Maya can list accessible articles (200 OK)');
    const mayaArticles = getPayload(mayaArticlesRes);
    const containsCulture = mayaArticles.some((a) => a.sectionId === cultureSection.id && a.authorId !== mayaUser.id);
    assert(!containsCulture, 'Writers cannot list articles from unassigned sections (server-side scoped)');

    // Find Elena's article in Culture (unassigned to Maya)
    const elenaCultureArt = await prisma.article.findFirst({
      where: { sectionId: cultureSection.id },
    });
    // Maya attempts to fetch Elena's Culture article directly by ID
    const mayaUnauthorizedGet = await request(`/api/articles/${elenaCultureArt.id}`, {
      headers: { Authorization: `Bearer ${mayaToken}` },
    });
    assert(mayaUnauthorizedGet.status === 404, 'Writer cannot access unassigned section article (404 zero-disclosure)');

    // [Test 4: Editor Full Newsroom Access]
    console.log('\n[Test 4: Editor Access Rights]');
    const editorGetArt = await request(`/api/articles/${elenaCultureArt.id}`, {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(editorGetArt.status === 200, 'Editor can access newsroom article across all sections (200 OK)');
    assert(getPayload(editorGetArt).title === elenaCultureArt.title, 'Editor receives accurate article details');

    // [Test 5: AuthorId Forgery Prevention]
    console.log('\n[Test 5: Author ID Forgery Prevention]');
    const forgedArticleRes = await request('/api/articles', {
      method: 'POST',
      headers: { Authorization: `Bearer ${mayaToken}` },
      body: {
        title: '[TEST] Quantum Semiconductor Benchmarks',
        body: 'Investigating cryogenic quantum computing chips and coherence timings in laboratory trials.',
        sectionId: techSection.id,
        authorId: jamesUser.id, // Attempt to forge authorId as James
      },
    });
    assert(forgedArticleRes.status === 201, 'Article created successfully (201 Created)');
    const createdArt = getPayload(forgedArticleRes);
    assert(createdArt.authorId === mayaUser.id, 'Server enforces authorId strictly from session, ignoring forged payload');
    testCreatedArticleId = createdArt.id;

    // [Test 6: Invalid and Archived Section Protection]
    console.log('\n[Test 6: Invalid and Archived Section Handling]');
    const badSectionRes = await request('/api/articles', {
      method: 'POST',
      headers: { Authorization: `Bearer ${mayaToken}` },
      body: {
        title: 'Story in Imaginary Desk',
        body: 'This belongs nowhere in the newsroom.',
        sectionId: 'non_existent_section_id',
      },
    });
    assert(badSectionRes.status === 404, 'Reject creating article in non-existent section (404 Not Found)');

    const archivedSectionRes = await request('/api/articles', {
      method: 'POST',
      headers: { Authorization: `Bearer ${editorToken}` },
      body: {
        title: 'Story in Archived Crypto Desk',
        body: 'Attempting to write into a closed historical section desk.',
        sectionId: archivedSection.id,
      },
    });
    assert(archivedSectionRes.status === 400, 'Reject creating article in archived section (400 Bad Request)');

    // Writer attempting to create in an active section they are NOT assigned to
    const mayaUnassignedSectionRes = await request('/api/articles', {
      method: 'POST',
      headers: { Authorization: `Bearer ${mayaToken}` },
      body: {
        title: 'Maya writing in Culture',
        body: 'Maya is not assigned to the Culture desk and should be rejected.',
        sectionId: cultureSection.id,
      },
    });
    assert(mayaUnassignedSectionRes.status === 403, 'Writer blocked from creating article in unassigned section (403 Forbidden)');

    // [Test 7: Article Creation Data Invariants]
    console.log('\n[Test 7: Initial Revision & Timeline Event Consistency]');
    const createdArtDetails = await request(`/api/articles/${testCreatedArticleId}`, {
      headers: { Authorization: `Bearer ${mayaToken}` },
    });
    assert(createdArtDetails.status === 200, 'Can retrieve created test article details');
    const artData = getPayload(createdArtDetails);
    assert(artData.status === 'DRAFT', 'Initial workflow state is DRAFT');
    assert(artData.workingRevision !== null, 'Article has an active workingRevision');
    assert(artData.workingRevision.revisionNumber === 1, 'Initial revision is numbered #1');
    assert(artData.publishedRevision === null, 'Article has no publishedRevision initially');

    // Check timeline event created atomically
    const timelineRes = await request(`/api/articles/${testCreatedArticleId}/timeline`, {
      headers: { Authorization: `Bearer ${mayaToken}` },
    });
    assert(timelineRes.status === 200, 'Timeline retrieval responds 200 OK');
    const timelineData = getPayload(timelineRes);
    const createdEvent = timelineData.find((e) => e.eventType === 'CREATED');
    assert(createdEvent !== undefined, 'Article creation generated a CREATED timeline event atomically');
    assert(createdEvent.newStatus === 'DRAFT', 'Created timeline event records newStatus as DRAFT');

    // [Test 8: Validation & Bad Input]
    console.log('\n[Test 8: Input Validation]');
    const shortBodyRes = await request('/api/articles', {
      method: 'POST',
      headers: { Authorization: `Bearer ${mayaToken}` },
      body: { title: 'Valid Title', body: 'Short', sectionId: techSection.id },
    });
    assert(shortBodyRes.status === 400, 'Body shorter than minimum length rejected with 400');

    // [Test 9: Revision Scoping & Isolation]
    console.log('\n[Test 9: Revision Scoping & Cross-Article Isolation]');
    const revisionsRes = await request(`/api/articles/${testCreatedArticleId}/revisions`, {
      headers: { Authorization: `Bearer ${mayaToken}` },
    });
    assert(revisionsRes.status === 200, 'List revisions responds 200 OK');
    const revsData = getPayload(revisionsRes);
    assert(revsData.length >= 1, 'Returns revisions for the article');
    assert(revsData.every((r) => r.articleId === testCreatedArticleId), 'All returned revisions belong strictly to requested article');

    // Attempting to access a revision of another article under this article ID
    const otherArticleRev = await prisma.articleRevision.findFirst({
      where: { articleId: { not: testCreatedArticleId } },
    });
    const crossRevGet = await request(`/api/articles/${testCreatedArticleId}/revisions/${otherArticleRev.id}`, {
      headers: { Authorization: `Bearer ${mayaToken}` },
    });
    assert(crossRevGet.status === 404, 'Cross-article revision access rejected (404 Not Found)');

    // [Test 10 & 11: Opening New Revisions & Snapshot Immutability]
    console.log('\n[Test 10 & 11: Opening Revisions & Snapshot Immutability]');
    // Published Article 1 in seed data: "The Hidden Environmental Cost of Hyperscale AI Compute"
    const publishedArt1 = await prisma.article.findFirst({
      where: { status: 'PUBLISHED', publishedRevisionId: { not: null } },
      include: { publishedRevision: true },
    });

    const initialPublishedRevId = publishedArt1.publishedRevisionId;
    const initialPublishedBody = publishedArt1.publishedRevision.body;

    // Open a new revision on Published Article 1
    const openRevRes = await request(`/api/articles/${publishedArt1.id}/revisions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editorToken}` },
      body: {
        title: publishedArt1.title + ' (Proposed Revision)',
        body: 'Updated investigation with newly declassified cooling logs from the Department of Energy.',
      },
    });
    assert(openRevRes.status === 201, 'Opening a new revision succeeds with 201 Created');
    assert(getPayload(openRevRes).revisionNumber > 1, 'New revision receives sequential revision number');

    // Verify published revision pointer was NOT changed
    const artAfterNewRev = await prisma.article.findUnique({
      where: { id: publishedArt1.id },
      include: { publishedRevision: true },
    });
    assert(artAfterNewRev.publishedRevisionId === initialPublishedRevId, 'Opening new revision leaves publishedRevisionId unchanged');
    assert(artAfterNewRev.publishedRevision.body === initialPublishedBody, 'Original published snapshot body is untouched and immutable');

    // [Test 12: Concurrent Revision Number Allocation]
    console.log('\n[Test 12: Concurrent Revision Creation Safety]');
    // Send 2 concurrent revision creation requests to the same article
    await Promise.all([
      request(`/api/articles/${testCreatedArticleId}/revisions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${mayaToken}` },
        body: { title: 'Concurrent Attempt 1', body: 'Concurrent body text test 1 long enough.' },
      }),
      request(`/api/articles/${testCreatedArticleId}/revisions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${mayaToken}` },
        body: { title: 'Concurrent Attempt 2', body: 'Concurrent body text test 2 long enough.' },
      }),
    ]);

    // Check revision numbers for article
    const createdRevs = await prisma.articleRevision.findMany({
      where: { articleId: testCreatedArticleId },
      select: { revisionNumber: true },
    });
    const revNumbers = createdRevs.map((r) => r.revisionNumber);
    const hasDuplicates = new Set(revNumbers).size !== revNumbers.length;
    assert(!hasDuplicates, 'Concurrent revision creations never produce duplicate revision numbers');

    // [Test 13: Comments & Atomic Timeline Events]
    console.log('\n[Test 13: Editorial Comments & Atomicity]');
    const commentRes = await request(`/api/articles/${testCreatedArticleId}/comments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editorToken}` },
      body: { content: 'Please verify the cryogenic temperature measurements in paragraph 2.' },
    });
    assert(commentRes.status === 201, 'Editor can add comment (201 Created)');
    assert(getPayload(commentRes).content.includes('cryogenic temperature'), 'Comment content recorded accurately');

    // Check timeline event for comment
    const timelineAfterComment = await request(`/api/articles/${testCreatedArticleId}/timeline`, {
      headers: { Authorization: `Bearer ${mayaToken}` },
    });
    const commentsTimelineData = getPayload(timelineAfterComment);
    const commentTimelineEvent = commentsTimelineData.find((e) => e.eventType === 'COMMENT_ADDED');
    assert(commentTimelineEvent !== undefined, 'COMMENT_ADDED timeline event recorded atomically with comment');

    // [Test 14: Privacy of Comments & Timelines]
    console.log('\n[Test 14: Privacy of Comments & Timelines]');
    // Maya cannot view comments on Elena's Culture article
    const unauthorizedComments = await request(`/api/articles/${elenaCultureArt.id}/comments`, {
      headers: { Authorization: `Bearer ${mayaToken}` },
    });
    assert(unauthorizedComments.status === 404, 'Unauthorized writer cannot access comments on unassigned article (404)');

    const unauthorizedTimeline = await request(`/api/articles/${elenaCultureArt.id}/timeline`, {
      headers: { Authorization: `Bearer ${mayaToken}` },
    });
    assert(unauthorizedTimeline.status === 404, 'Unauthorized writer cannot access timeline on unassigned article (404)');

    // [Test 15: Tamper-Proof Audit Immutability Protection]
    console.log('\n[Test 15: Tamper-Proof Audit Immutability]');
    // No HTTP route exists for modifying or deleting timeline events
    const deleteTimelineHttp = await request(`/api/articles/${testCreatedArticleId}/timeline`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(deleteTimelineHttp.status === 404 || deleteTimelineHttp.status === 405, 'HTTP DELETE on timeline endpoint is rejected/not found');

    // Test PostgreSQL database engine trigger: trg_timeline_immutable
    let triggerCaught = false;
    try {
      const anyEvent = await prisma.timelineEvent.findFirst({ where: { articleId: testCreatedArticleId } });
      await prisma.timelineEvent.delete({ where: { id: anyEvent.id } });
    } catch (dbErr) {
      triggerCaught = dbErr.message.includes('strictly immutable') || dbErr.message.includes('prevent_timeline_mutation');
    }
    assert(triggerCaught, 'PostgreSQL engine trigger (trg_timeline_immutable) blocks direct deletion of timeline events');

    // [Test 16: Generic Patch Workflow Bypass Protection]
    console.log('\n[Test 16: Generic Patch Workflow Bypass Protection]');
    // Attempting to bypass workflow state machine by setting status to PUBLISHED via PATCH
    const bypassPatchRes = await request(`/api/articles/${testCreatedArticleId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${editorToken}` },
      body: {
        title: '[TEST] Quantum Semiconductor Benchmarks (Updated)',
        status: 'PUBLISHED', // Illegal bypass attempt
        publishedRevisionId: 'fake_revision_id',
      },
    });
    assert(bypassPatchRes.status === 200, 'Generic PATCH responds 200 for valid title update');
    const updatedData = getPayload(bypassPatchRes);
    assert(updatedData.title.includes('(Updated)'), 'Title was updated properly');
    assert(updatedData.status === 'DRAFT', 'Workflow status remained DRAFT; bypass attempt ignored');
    assert(updatedData.publishedRevisionId === null, 'publishedRevisionId remained null');

    // Attempting to directly edit published article via generic PATCH must be rejected
    const patchPublishedRes = await request(`/api/articles/${publishedArt1.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${editorToken}` },
      body: { title: 'Hacked Published Headline' },
    });
    assert(patchPublishedRes.status === 400, 'Direct PATCH on PUBLISHED article is rejected (400 Bad Request)');

    // Attempting to DELETE an article must be rejected (405 Method Not Allowed)
    const deleteArtRes = await request(`/api/articles/${testCreatedArticleId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(deleteArtRes.status === 405, 'DELETE /api/articles/:id is rejected with 405 Method Not Allowed');

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
  console.log(`PHASE 4 ARTICLES RESULTS: ${passedCount}/${totalCount} checks passed.`);
  console.log('====================================================\n');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runTests();
