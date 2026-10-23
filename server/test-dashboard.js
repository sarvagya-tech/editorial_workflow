import 'dotenv/config';
process.env.NODE_ENV = 'test';
import http from 'http';
import { prisma } from './src/prisma.js';
import { getUtcWeekBoundaries, getLastEightWeeks } from './src/services/dashboard.service.js';
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
  console.log('STARTING PHASE 8: DASHBOARD & ANALYTICS TEST SUITE');
  console.log('====================================================\n');

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  let editorToken = null;
  let mayaToken = null; // Maya Patel (assigned to Tech & Politics)
  let elenaToken = null; // Elena Rostova (assigned to Culture only)

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

    // ----------------------------------------------------
    // [Test Group 1: Week Boundaries & Date Math Unit Checks]
    // ----------------------------------------------------
    console.log('[Test Group 1: Week Boundaries & Date Math]');

    // Test Friday reference
    const fridayRef = new Date('2026-10-23T14:30:00.000Z');
    const { monday: friMonday, sunday: friSunday } = getUtcWeekBoundaries(fridayRef);
    assert(friMonday.toISOString().startsWith('2026-10-19T00:00:00.000Z'), 'Friday reference resolves to Monday 00:00:00Z');
    assert(friSunday.toISOString().startsWith('2026-10-25T23:59:59.999Z'), 'Friday reference resolves to Sunday 23:59:59Z');

    // Test Sunday reference
    const sundayRef = new Date('2026-10-25T22:00:00.000Z');
    const { monday: sunMonday } = getUtcWeekBoundaries(sundayRef);
    assert(sunMonday.toISOString().startsWith('2026-10-19T00:00:00.000Z'), 'Sunday reference correctly anchors to preceding Monday');

    // Test 8-weeks generation
    const eightWeeks = getLastEightWeeks(fridayRef);
    assert(eightWeeks.length === 8, 'Generates exactly 8 calendar weeks');
    assert(eightWeeks[7].weekLabel === '2026-10-19', 'Week 8 (current week) is 2026-10-19');
    assert(eightWeeks[0].weekLabel === '2026-08-31', 'Week 1 (oldest week) is 2026-08-31 (7 weeks prior)');
    assert(
      new Date(eightWeeks[0].weekStart) < new Date(eightWeeks[1].weekStart),
      'Eight weeks are in strict chronological order from oldest to newest'
    );

    // ----------------------------------------------------
    // [Test Group 2: Authentication & Endpoint Accessibility]
    // ----------------------------------------------------
    console.log('\n[Test Group 2: Authentication & Endpoint Access]');

    const unauthRes = await request('/api/dashboard');
    assert(unauthRes.status === 401, 'Unauthenticated GET /api/dashboard rejected with 401 Unauthorized');

    const editorRes = await request('/api/dashboard', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(editorRes.status === 200, 'Authenticated editor GET /api/dashboard responds 200 OK');
    const edData = getPayload(editorRes);
    assert(edData.summary !== undefined, 'Dashboard payload contains summary object');
    assert(Array.isArray(edData.byStatus), 'Dashboard payload contains byStatus array');
    assert(Array.isArray(edData.bySection), 'Dashboard payload contains bySection array');
    assert(Array.isArray(edData.weeklyPublications), 'Dashboard payload contains weeklyPublications array');

    // ----------------------------------------------------
    // [Test Group 3: Editor Summary Metrics]
    // ----------------------------------------------------
    console.log('\n[Test Group 3: Summary Metrics Accuracy]');

    const summary = edData.summary;
    assert(typeof summary.inReview === 'number', 'summary.inReview is a number');
    assert(typeof summary.scheduledThisWeek === 'number', 'summary.scheduledThisWeek is a number');
    assert(typeof summary.publishedThisWeek === 'number', 'summary.publishedThisWeek is a number');
    assert(typeof summary.openDrafts === 'number', 'summary.openDrafts is a number');

    // Verify against DB direct counts for editor scope
    const dbInReview = await prisma.article.count({
      where: { status: 'IN_REVIEW', section: { isArchived: false } },
    });
    assert(summary.inReview === dbInReview, `inReview count (${summary.inReview}) matches database records (${dbInReview})`);

    const dbDrafts = await prisma.article.count({
      where: { status: 'DRAFT', section: { isArchived: false } },
    });
    assert(summary.openDrafts === dbDrafts, `openDrafts count (${summary.openDrafts}) matches database records (${dbDrafts})`);

    const { monday: curMon, sunday: curSun } = getUtcWeekBoundaries();
    const dbSched = await prisma.article.count({
      where: {
        status: 'SCHEDULED',
        section: { isArchived: false },
        publishAt: { gte: curMon, lte: curSun },
      },
    });
    assert(summary.scheduledThisWeek === dbSched, `scheduledThisWeek count (${summary.scheduledThisWeek}) matches database records (${dbSched})`);

    const dbPub = await prisma.article.count({
      where: {
        status: 'PUBLISHED',
        section: { isArchived: false },
        publishedAt: { gte: curMon, lte: curSun },
      },
    });
    assert(summary.publishedThisWeek === dbPub, `publishedThisWeek count (${summary.publishedThisWeek}) matches database records (${dbPub})`);

    // ----------------------------------------------------
    // [Test Group 4: Status Breakdown Completeness]
    // ----------------------------------------------------
    console.log('\n[Test Group 4: Status Breakdown]');

    const byStatus = edData.byStatus;
    const expectedStatuses = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHED'];
    assert(byStatus.length === 5, 'byStatus contains all 5 canonical statuses');
    assert(
      expectedStatuses.every((st) => byStatus.some((s) => s.status === st)),
      'Every canonical workflow status is present in byStatus'
    );
    assert(
      byStatus.every((s) => typeof s.count === 'number' && s.count >= 0),
      'Each status entry has a non-negative integer count'
    );

    // ----------------------------------------------------
    // [Test Group 5: Section Breakdown & Active Desks]
    // ----------------------------------------------------
    console.log('\n[Test Group 5: Section Breakdown]');

    const bySection = edData.bySection;
    assert(bySection.length >= 1, 'bySection contains active newsroom sections');
    assert(
      bySection.every((sec) => sec.sectionId && sec.sectionName && typeof sec.count === 'number'),
      'Each section entry contains sectionId, sectionName, and numeric count'
    );
    assert(
      !bySection.some((sec) => sec.isArchived),
      'Archived sections are excluded from active newsroom section breakdown'
    );

    // ----------------------------------------------------
    // [Test Group 6: Eight-Week Publication Trend]
    // ----------------------------------------------------
    console.log('\n[Test Group 6: Eight-Week Publication Trend]');

    const weekly = edData.weeklyPublications;
    assert(weekly.length === 8, 'weeklyPublications returns exactly 8 calendar weeks');
    assert(
      weekly.every((w) => /^\d{4}-\d{2}-\d{2}$/.test(w.weekStart) && typeof w.count === 'number'),
      'Each week entry has a valid YYYY-MM-DD weekStart and numeric count'
    );
    // Chronological order verification
    for (let i = 0; i < weekly.length - 1; i++) {
      assert(
        new Date(weekly[i].weekStart) < new Date(weekly[i + 1].weekStart),
        `Week ${i} (${weekly[i].weekStart}) precedes Week ${i + 1} (${weekly[i + 1].weekStart}) chronologically`
      );
    }
    // Zero-count handling: weeks with 0 publications must still be present
    assert(
      weekly.every((w) => w.count !== undefined && w.count !== null),
      'Every week is populated without missing or undefined counts'
    );

    // ----------------------------------------------------
    // [Test Group 7: Role-Based Visibility & Writer Scoping]
    // ----------------------------------------------------
    console.log('\n[Test Group 7: Role-Based Scoping (Writer vs Editor)]');

    const mayaRes = await request('/api/dashboard', {
      headers: { Authorization: `Bearer ${mayaToken}` },
    });
    assert(mayaRes.status === 200, 'Authenticated writer GET /api/dashboard responds 200 OK');
    const mayaData = getPayload(mayaRes);

    const elenaRes = await request('/api/dashboard', {
      headers: { Authorization: `Bearer ${elenaToken}` },
    });
    assert(elenaRes.status === 200, 'Authenticated single-desk writer responds 200 OK');
    const elenaData = getPayload(elenaRes);

    // Elena is assigned ONLY to Culture.
    // Editor has access to Tech, Politics, Culture, Investigative.
    // Elena's total visible articles across byStatus should be strictly less than or equal to Editor's.
    const edTotalArticles = edData.byStatus.reduce((acc, s) => acc + s.count, 0);
    const elenaTotalArticles = elenaData.byStatus.reduce((acc, s) => acc + s.count, 0);
    assert(
      elenaTotalArticles <= edTotalArticles,
      `Writer Elena visible total (${elenaTotalArticles}) is appropriately scoped relative to Editor total (${edTotalArticles})`
    );

    // Elena should not see Tech section in bySection if unassigned and unauthored
    const elenaTech = elenaData.bySection.find((s) => s.sectionName === 'Technology & Silicon');
    assert(
      !elenaTech || elenaTech.count === 0,
      'Single-desk writer cannot see unassigned desk articles in section metrics'
    );

    // ----------------------------------------------------
    // [Test Group 8: Dynamic State Changes & Unpublish Impact]
    // ----------------------------------------------------
    console.log('\n[Test Group 8: Dynamic State Changes]');

    // Find a published article to test unpublish metric reflection
    const pubArticle = await prisma.article.findFirst({
      where: { status: 'PUBLISHED', section: { isArchived: false } },
    });

    if (pubArticle) {
      const initialPubCount = edData.byStatus.find((s) => s.status === 'PUBLISHED').count;

      // Unpublish the article
      const unpubRes = await request(`/api/articles/${pubArticle.id}/unpublish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${editorToken}` },
        body: { reason: 'Temporary retraction to verify analytics decrement.' },
      });
      assert(unpubRes.status === 200, 'Article unpublished successfully');

      // Fetch updated dashboard
      const updatedEdRes = await request('/api/dashboard', {
        headers: { Authorization: `Bearer ${editorToken}` },
      });
      const updatedPubCount = getPayload(updatedEdRes).byStatus.find((s) => s.status === 'PUBLISHED').count;

      assert(
        updatedPubCount === initialPubCount - 1,
        `PUBLISHED status count decreased from ${initialPubCount} to ${updatedPubCount} after unpublishing`
      );

      // Re-publish the article to restore baseline
      const repubRes = await request(`/api/articles/${pubArticle.id}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${editorToken}` },
      });
      assert(repubRes.status === 200, 'Article republished successfully');

      const restoredEdRes = await request('/api/dashboard', {
        headers: { Authorization: `Bearer ${editorToken}` },
      });
      const restoredPubCount = getPayload(restoredEdRes).byStatus.find((s) => s.status === 'PUBLISHED').count;
      assert(
        restoredPubCount === initialPubCount,
        `PUBLISHED count restored to ${restoredPubCount} after republishing`
      );
    }

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
  console.log(`PHASE 8 DASHBOARD & ANALYTICS RESULTS: ${passedCount}/${totalCount} checks passed.`);
  console.log('====================================================\n');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
  process.exit(0);
}

runTests();
