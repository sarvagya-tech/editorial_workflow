// ==============================================================================
// ARTICLE DISCOVERY, SEARCH, PAGINATION & CALENDAR CSV TEST SUITE (PHASE 6)
// File: server/test-search-calendar.js
// Target: Tests all Search, Filter, Sort, Pagination & Calendar CSV requirements.
// ==============================================================================

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

async function requestRaw(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: options.headers || {},
  });
  const text = await res.text().catch(() => '');
  return {
    status: res.status,
    headers: res.headers,
    text,
  };
}

function getPayload(res) {
  if (!res || !res.data) return null;
  return res.data.data !== undefined ? res.data.data : res.data;
}

async function runTests() {
  console.log('====================================================');
  console.log('STARTING PHASE 6: SEARCH & CALENDAR CSV TEST SUITE');
  console.log('====================================================\n');

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  let editorToken = null;
  let mayaToken = null; // Maya Patel (Tech & Culture writer)
  let jamesToken = null; // James Wilson (Politics writer)
  let editorUser = null;
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

    // Login accounts
    const edRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'editor@dispatch.com', password: 'password123' },
    });
    editorToken = edRes.data.token;
    editorUser = edRes.data.user;

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

    const sectionsRes = await request('/api/sections?includeArchived=true', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    const sections = getPayload(sectionsRes);
    const techSection = sections.find((s) => s.name === 'Technology & Silicon');
    const cultureSection = sections.find((s) => s.name === 'Culture & Modern Arts');
    const politicsSection = sections.find((s) => s.name === 'Politics & Civic Affairs');
    const investigateSection = sections.find((s) => s.name === 'Investigative & Enterprise');
    let archivedSection = sections.find((s) => s.isArchived);
    let createdArchivedSection = false;
    if (!archivedSection) {
      archivedSection = await prisma.section.create({
        data: {
          name: 'Archived Legacy Archives',
          description: 'Historical archive desk',
          ownerEditorId: editorUser.id,
          isArchived: true,
        },
      });
      createdArchivedSection = true;
    }

    // [Test Group 1: Server-Side Search Requirements]
    console.log('[Test Group 1: Server-Side Search]');

    // 1. Search matches title
    const titleSearchRes = await request('/api/articles?q=Modular', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(titleSearchRes.status === 200, 'Search by title responds 200 OK');
    const titleResults = getPayload(titleSearchRes);
    assert(titleResults.length >= 1, 'Search matches article title keyword');
    assert(
      titleResults.some((a) => a.title.toLowerCase().includes('modular')),
      'Result title contains searched keyword "Modular"'
    );

    // 2. Search matches body copy
    const bodySearchRes = await request('/api/articles?q=evaporative', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(bodySearchRes.status === 200, 'Search by body content responds 200 OK');
    const bodyResults = getPayload(bodySearchRes);
    assert(bodyResults.length >= 1, 'Search matches term present only in body copy ("evaporative")');
    assert(
      bodyResults.some((a) => a.title.includes('Micro-Forestry')),
      'Article containing "evaporative" in body is discovered'
    );

    // 3. Partial-word matching
    const partialSearchRes = await request('/api/articles?q=hyperscal', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(partialSearchRes.status === 200, 'Partial-word search responds 200 OK');
    const partialResults = getPayload(partialSearchRes);
    assert(partialResults.length >= 1, 'Partial-word query "hyperscal" matches "Hyperscale"');

    // 4. Empty and whitespace-only search
    const emptySearchRes = await request('/api/articles?q=%20%20%20', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(emptySearchRes.status === 200, 'Whitespace search query handled gracefully');
    assert(getPayload(emptySearchRes).length >= 1, 'Whitespace search returns unconstrained results');

    // 5. Special characters and wildcards safety
    const specialCharsRes = await request('/api/articles?q=%25_%27%22%26%5B%5D', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(specialCharsRes.status === 200, 'Special characters (%_\'"&[]) handled safely without error');

    // 6. Combined search and filters
    const combinedRes = await request(`/api/articles?q=Modular&sectionId=${techSection.id}&status=PUBLISHED`, {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(combinedRes.status === 200, 'Combined search (q + sectionId + status) responds 200 OK');
    const combinedData = getPayload(combinedRes);
    assert(
      combinedData.every((a) => a.sectionId === techSection.id && a.status === 'PUBLISHED'),
      'Combined search strictly adheres to all supplied filter criteria'
    );

    // 7. Input validation on query parameters
    const badStatusRes = await request('/api/articles?status=INVALID_STATUS', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(badStatusRes.status === 400, 'Invalid status parameter rejected with 400 Bad Request');

    const badSortRes = await request('/api/articles?sortBy=non_existent_column', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(badSortRes.status === 400, 'Invalid sortBy parameter rejected with 400 Bad Request');

    const badOrderRes = await request('/api/articles?order=sideways', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(badOrderRes.status === 400, 'Invalid order parameter rejected with 400 Bad Request');

    const badPageRes = await request('/api/articles?page=-5', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(badPageRes.status === 400, 'Negative page number rejected with 400 Bad Request');

    const badLimitRes = await request('/api/articles?limit=500', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(badLimitRes.status === 400, 'Limit exceeding max allowed (100) rejected with 400 Bad Request');

    // [Test Group 2: Authorization & Visibility Scoping]
    console.log('\n[Test Group 2: Authorization & Role Scoping]');
    // Maya searches with no query -> sees only own or assigned section articles
    const mayaAssignments = await prisma.sectionAssignment.findMany({
      where: { writerId: mayaUser.id, section: { isArchived: false } },
      select: { sectionId: true },
    });
    const mayaAssignedSectionIds = new Set(mayaAssignments.map((a) => a.sectionId));

    const mayaArticlesRes = await request('/api/articles', {
      headers: { Authorization: `Bearer ${mayaToken}` },
    });
    const mayaList = getPayload(mayaArticlesRes);
    const nonCompliant = mayaList.filter(
      (a) => a.authorId !== mayaUser.id && !mayaAssignedSectionIds.has(a.sectionId)
    );
    if (nonCompliant.length > 0) {
      console.log('Non-compliant articles found for Maya:', JSON.stringify(nonCompliant, null, 2));
    }
    assert(
      nonCompliant.length === 0,
      'Writer search results strictly scoped to authored or assigned active section articles'
    );

    // Maya queries culture desk (unassigned to Maya and not authored by Maya) -> returns 0 matching results
    const mayaUnassignedSectionSearch = await request(`/api/articles?sectionId=${cultureSection.id}`, {
      headers: { Authorization: `Bearer ${mayaToken}` },
    });
    assert(mayaUnassignedSectionSearch.status === 200, 'Writer querying unassigned section returns 200');
    assert(getPayload(mayaUnassignedSectionSearch).length === 0, 'Writer querying unassigned section receives 0 results');
    assert(mayaUnassignedSectionSearch.data.pagination.total === 0, 'Total count for unassigned section is 0 (zero-disclosure)');

    // Archived section content excluded from writer search
    const mayaArchivedSearch = await request(`/api/articles?sectionId=${archivedSection.id}`, {
      headers: { Authorization: `Bearer ${mayaToken}` },
    });
    assert(getPayload(mayaArchivedSearch).length === 0, 'Archived section content excluded from writer discovery');

    // [Test Group 3: Sorting & Pagination Determinism]
    console.log('\n[Test Group 3: Sorting & Pagination]');
    // Test sortBy=createdAt order=asc
    const sortCreatedAsc = await request('/api/articles?sortBy=createdAt&order=asc&limit=5', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(sortCreatedAsc.status === 200, 'sortBy=createdAt order=asc responds 200 OK');
    const createdAscList = getPayload(sortCreatedAsc);
    if (createdAscList.length >= 2) {
      const isAsc = new Date(createdAscList[0].createdAt) <= new Date(createdAscList[1].createdAt);
      assert(isAsc, 'Records ordered in ascending chronological order');
    }

    // Test sortBy=title order=asc
    const sortTitleAsc = await request('/api/articles?sortBy=title&order=asc&limit=5', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(sortTitleAsc.status === 200, 'sortBy=title order=asc responds 200 OK');

    // Test sortBy=scheduledAt (maps to publishAt)
    const sortScheduled = await request('/api/articles?sortBy=scheduledAt&order=desc&limit=5', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(sortScheduled.status === 200, 'sortBy=scheduledAt correctly accepted and processed');

    // Test pagination metadata
    const paginatedRes = await request('/api/articles?page=1&limit=2', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(paginatedRes.status === 200, 'Pagination page=1 limit=2 responds 200 OK');
    assert(getPayload(paginatedRes).length <= 2, 'Page size respects limit parameter');
    const meta = paginatedRes.data.pagination;
    assert(meta.page === 1, 'Current page is 1');
    assert(meta.limit === 2, 'Page limit is 2');
    assert(meta.total >= 1, 'Total matching records count is populated');
    assert(meta.totalPages >= 1, 'Total pages calculated accurately');
    assert(typeof meta.hasNextPage === 'boolean', 'hasNextPage boolean flag present');
    assert(typeof meta.hasPrevPage === 'boolean', 'hasPrevPage boolean flag present');

    // Out-of-range page
    const outOfRangeRes = await request('/api/articles?page=9999&limit=10', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(outOfRangeRes.status === 200, 'Out-of-range page responds 200 OK');
    assert(getPayload(outOfRangeRes).length === 0, 'Out-of-range page returns empty array');
    assert(outOfRangeRes.data.pagination.hasNextPage === false, 'Out-of-range page hasNextPage is false');
    assert(outOfRangeRes.data.pagination.hasPrevPage === true, 'Out-of-range page hasPrevPage is true');

    // Body content omitted from listing projections
    const firstArticle = getPayload(paginatedRes)[0];
    assert(firstArticle.body === undefined, 'Full article body copy omitted from listing payload');

    // [Test Group 4: Editorial Calendar CSV Export]
    console.log('\n[Test Group 4: Editorial Calendar CSV Export]');
    // 1. Export CSV endpoint responds with text/csv
    const csvRes = await requestRaw('/api/calendar/export.csv', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(csvRes.status === 200, 'GET /api/calendar/export.csv responds 200 OK');
    assert(
      csvRes.headers.get('content-type')?.includes('text/csv'),
      'Content-Type is text/csv'
    );
    assert(
      csvRes.headers.get('content-disposition')?.includes('attachment; filename="editorial-calendar.csv"'),
      'Content-Disposition header includes safe filename'
    );

    // 2. CSV Headers correct
    const csvLines = csvRes.text.trim().split('\r\n');
    const headerRow = csvLines[0];
    assert(
      headerRow === 'Article ID,Article Title,Section Name,Author Name,Author Email,Current Status,Scheduled Publish Time,Actual Published Time,Revision Number',
      'CSV header contains correct column names in expected order'
    );

    // 3. Only SCHEDULED or PUBLISHED articles included
    const statusIdx = 5; // Column 5 is Current Status
    const rows = csvLines.slice(1).map((r) => r.split(','));
    if (rows.length > 0 && rows[0].length > 1) {
      const allEligible = rows.every((r) => r[statusIdx] === 'SCHEDULED' || r[statusIdx] === 'PUBLISHED');
      assert(allEligible, 'Export contains exclusively SCHEDULED or PUBLISHED articles');
    }

    // 4. Section filter in CSV
    const techCsvRes = await requestRaw(`/api/calendar/export.csv?sectionId=${techSection.id}`, {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(techCsvRes.status === 200, 'CSV export with sectionId filter responds 200 OK');

    // 5. Date range filter in CSV
    const dateRangeCsvRes = await requestRaw('/api/calendar/export.csv?from=2026-01-01&to=2026-12-31', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(dateRangeCsvRes.status === 200, 'CSV export with from/to date range responds 200 OK');

    // 6. Invalid date range format rejected
    const badDateCsvRes = await requestRaw('/api/calendar/export.csv?from=invalid-date', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(badDateCsvRes.status === 400, 'Invalid from date format rejected with 400 Bad Request');

    const invertedDateCsvRes = await requestRaw('/api/calendar/export.csv?from=2026-12-31&to=2026-01-01', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(invertedDateCsvRes.status === 400, 'Inverted date range (from > to) rejected with 400 Bad Request');

    // 7. Writer role scoping in CSV export
    const mayaCsvRes = await requestRaw('/api/calendar/export.csv', {
      headers: { Authorization: `Bearer ${mayaToken}` },
    });
    assert(mayaCsvRes.status === 200, 'Writer can export accessible calendar items (200 OK)');
    const mayaCsvText = mayaCsvRes.text;
    assert(!mayaCsvText.includes('Culture & Modern Arts'), 'Writer CSV export does not leak articles from unassigned sections');

    // 8. Formula injection protection (CWE-1236 mitigation)
    // Create an article with potentially dangerous spreadsheet formula title
    const formulaArt = await prisma.article.create({
      data: {
        title: '=SUM(1+1)*cmd|"/C calc"!A0',
        body: 'Formula injection test article to verify sanitization in CSV generator.',
        sectionId: techSection.id,
        authorId: editorUser.id,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });

    const formulaCheckRes = await requestRaw('/api/calendar/export.csv', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(
      formulaCheckRes.text.includes("\"'=SUM(1+1)*cmd|") || formulaCheckRes.text.includes("'=SUM"),
      'Spreadsheet formula character (=) is neutralized with leading single quote'
    );

    // 9. Empty result returns valid CSV with header row
    const emptyCsvRes = await requestRaw('/api/calendar/export.csv?from=2099-01-01&to=2099-01-02', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(emptyCsvRes.status === 200, 'Query matching zero articles responds 200 OK');
    const emptyLines = emptyCsvRes.text.trim().split('\r\n');
    assert(emptyLines.length === 1, 'Empty results produce exactly 1 header row');
    assert(emptyLines[0].startsWith('Article ID,Article Title'), 'Empty result retains valid CSV headers');

    // Clean up test formula article and created archived section
    if (formulaArt?.id) {
      await prisma.article.delete({ where: { id: formulaArt.id } }).catch(() => {});
    }
    if (createdArchivedSection && archivedSection?.id) {
      await prisma.section.delete({ where: { id: archivedSection.id } }).catch(() => {});
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
  console.log(`PHASE 6 SEARCH & CALENDAR CSV RESULTS: ${passedCount}/${totalCount} checks passed.`);
  console.log('====================================================\n');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runTests();
