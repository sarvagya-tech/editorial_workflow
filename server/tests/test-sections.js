// ==============================================================================
// SECTIONS & ASSIGNMENTS AUTOMATED TEST SUITE (PHASE 3)
// File: server/test-sections.js
// Target: Tests all 18 Section & Assignment requirements against the live Neon DB.
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

async function runTests() {
  console.log('====================================================');
  console.log('STARTING PHASE 3: SECTIONS & ASSIGNMENTS TEST SUITE');
  console.log('====================================================\n');

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  let editorToken = null;
  let writerToken = null;
  let secondWriterToken = null;
  let testSectionId = null;

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
    const editorRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'editor@dispatch.com', password: 'password123' },
    });
    editorToken = editorRes.data.token;
    const editorUser = editorRes.data.user;

    const writerRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'writer@dispatch.com', password: 'password123' },
    });
    writerToken = writerRes.data.token;
    const writerUser = writerRes.data.user;

    const writer2Res = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'elena.writer@dispatch.com', password: 'password123' },
    });
    secondWriterToken = writer2Res.data.token;
    const writer2User = writer2Res.data.user;

    // 1. Unauthenticated requests are rejected
    console.log('[Test 1: Unauthenticated Requests]');
    const unauthGet = await request('/api/sections');
    assert(unauthGet.status === 401, 'Unauthenticated GET /api/sections returns 401');

    const unauthPost = await request('/api/sections', { method: 'POST', body: { name: 'Test' } });
    assert(unauthPost.status === 401, 'Unauthenticated POST /api/sections returns 401');

    // 2. Writer cannot create a section
    console.log('\n[Test 2: Writer Section Creation Prohibition]');
    const writerCreate = await request('/api/sections', {
      method: 'POST',
      headers: { Authorization: `Bearer ${writerToken}` },
      body: { name: 'Unauthorized Desk', ownerEditorId: editorUser.id },
    });
    assert(writerCreate.status === 403, 'Writer cannot create section (403 Forbidden)');

    // 3. Editor can create a valid section
    console.log('\n[Test 3: Editor Section Creation]');
    const uniqueSecName = `Global Climate & Energy ${Date.now()}`;
    const editorCreate = await request('/api/sections', {
      method: 'POST',
      headers: { Authorization: `Bearer ${editorToken}` },
      body: {
        name: uniqueSecName,
        description: 'Tracking renewable infrastructure and climate policy.',
        ownerEditorId: editorUser.id,
      },
    });
    assert(editorCreate.status === 201, 'Editor can create a valid section (201 Created)');
    assert(editorCreate.data?.name === uniqueSecName, 'Created section returns correct name');
    assert(editorCreate.data?.ownerEditor?.id === editorUser.id, 'Created section carries owner information');
    testSectionId = editorCreate.data?.id;

    // 4. Duplicate section names rejected
    console.log('\n[Test 4: Duplicate Section Name Rejection]');
    const duplicateCreate = await request('/api/sections', {
      method: 'POST',
      headers: { Authorization: `Bearer ${editorToken}` },
      body: {
        name: uniqueSecName,
        ownerEditorId: editorUser.id,
      },
    });
    assert(duplicateCreate.status === 409, 'Duplicate section name rejected with 409 Conflict');

    // 5. Invalid section owner rejected (Writer cannot be section owner)
    console.log('\n[Test 5: Invalid Section Owner Validation]');
    const invalidOwnerCreate = await request('/api/sections', {
      method: 'POST',
      headers: { Authorization: `Bearer ${editorToken}` },
      body: {
        name: `Invalid Owner Desk ${Date.now()}`,
        ownerEditorId: writerUser.id, // Writer used as owner!
      },
    });
    assert(invalidOwnerCreate.status === 400, 'Non-editor owner rejected with 400 Bad Request');

    // 6. Writer cannot update, archive or restore section
    console.log('\n[Test 6: Writer Section Modification Prohibition]');
    const writerUpdate = await request(`/api/sections/${testSectionId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${writerToken}` },
      body: { name: 'Hacked Name' },
    });
    assert(writerUpdate.status === 403, 'Writer cannot update section (403 Forbidden)');

    const writerArchive = await request(`/api/sections/${testSectionId}/archive`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${writerToken}` },
    });
    assert(writerArchive.status === 403, 'Writer cannot archive section (403 Forbidden)');

    const writerRestore = await request(`/api/sections/${testSectionId}/restore`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${writerToken}` },
    });
    assert(writerRestore.status === 403, 'Writer cannot restore section (403 Forbidden)');

    // 7. Editor can update section
    console.log('\n[Test 7: Editor Section Update]');
    const editorUpdate = await request(`/api/sections/${testSectionId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${editorToken}` },
      body: { description: 'Updated coverage scope for energy transition.' },
    });
    assert(editorUpdate.status === 200, 'Editor can update section description (200 OK)');
    assert(
      editorUpdate.data?.description === 'Updated coverage scope for energy transition.',
      'Updated section reflects new description'
    );

    // 8. Assign writer to section
    console.log('\n[Test 8: Writer Assignment]');
    const assignRes = await request(`/api/sections/${testSectionId}/assignments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editorToken}` },
      body: { writerId: writerUser.id },
    });
    assert(assignRes.status === 201, 'Editor can assign a writer (201 Created)');
    assert(assignRes.data?.writer?.id === writerUser.id, 'Assignment carries assigned writer info');

    // 9. Assign invalid writer ID
    console.log('\n[Test 9: Invalid Writer Assignment Validation]');
    const invalidWriterAssign = await request(`/api/sections/${testSectionId}/assignments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editorToken}` },
      body: { writerId: 'non-existent-user-id' },
    });
    assert(invalidWriterAssign.status === 404, 'Assigning non-existent writer ID returns 404');

    // 10. Editor cannot assign another editor as a writer
    const assignEditorAsWriter = await request(`/api/sections/${testSectionId}/assignments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editorToken}` },
      body: { writerId: editorUser.id },
    });
    assert(assignEditorAsWriter.status === 400, 'Assigning editor as a writer rejected with 400');

    // 11. Duplicate assignments rejected
    console.log('\n[Test 10: Duplicate Assignment Rejection]');
    const duplicateAssign = await request(`/api/sections/${testSectionId}/assignments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editorToken}` },
      body: { writerId: writerUser.id },
    });
    assert(duplicateAssign.status === 409, 'Duplicate assignment rejected with 409 Conflict');

    // 12. Concurrent duplicate assignment attempts safely handled
    console.log('\n[Test 11: Concurrent Duplicate Assignment Handling]');
    const [c1, c2] = await Promise.all([
      request(`/api/sections/${testSectionId}/assignments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${editorToken}` },
        body: { writerId: writer2User.id },
      }),
      request(`/api/sections/${testSectionId}/assignments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${editorToken}` },
        body: { writerId: writer2User.id },
      }),
    ]);
    const successCount = [c1, c2].filter((r) => r.status === 201).length;
    const conflictCount = [c1, c2].filter((r) => r.status === 409).length;
    assert(
      successCount === 1 && conflictCount === 1,
      'Concurrent duplicate assignments result in exactly 1 created and 1 conflict (race condition prevented)'
    );

    // 13. Writer visibility scoping
    console.log('\n[Test 12: Writer Section Visibility Scoping]');
    // Writer 1 is assigned to testSectionId
    const writerList = await request('/api/sections', {
      headers: { Authorization: `Bearer ${writerToken}` },
    });
    assert(writerList.status === 200, 'Writer can list assigned sections (200 OK)');
    const canSeeAssigned = writerList.data.some((s) => s.id === testSectionId);
    assert(canSeeAssigned, 'Writer can view section they are assigned to');

    // Create an unassigned section and verify writer cannot see it
    const unassignedSecName = `Secret Internal Desk ${Date.now()}`;
    const unassignedSec = await request('/api/sections', {
      method: 'POST',
      headers: { Authorization: `Bearer ${editorToken}` },
      body: { name: unassignedSecName, ownerEditorId: editorUser.id },
    });
    const unassignedId = unassignedSec.data.id;

    const writerListAfter = await request('/api/sections', {
      headers: { Authorization: `Bearer ${writerToken}` },
    });
    const canSeeUnassigned = writerListAfter.data.some((s) => s.id === unassignedId);
    assert(!canSeeUnassigned, 'Writer CANNOT view unassigned section in list');

    // 14. Unauthorized writer cannot retrieve section by guessing ID
    console.log('\n[Test 13: Non-disclosure Protection on Section ID]');
    const writerGetUnassigned = await request(`/api/sections/${unassignedId}`, {
      headers: { Authorization: `Bearer ${writerToken}` },
    });
    assert(
      writerGetUnassigned.status === 404,
      'Unauthorized writer receives 404 when requesting unassigned section by ID (non-disclosure policy)'
    );

    // 15. Writer cannot enumerate other writers assignments
    console.log('\n[Test 14: Assignment Privacy for Writers]');
    const writerViewAssignments = await request(`/api/sections/${testSectionId}/assignments`, {
      headers: { Authorization: `Bearer ${writerToken}` },
    });
    assert(writerViewAssignments.status === 200, 'Writer can view assignments endpoint for accessible section');
    assert(
      writerViewAssignments.data?.assignments?.length === 1 &&
        writerViewAssignments.data.assignments[0]?.writerId === writerUser.id,
      "Writer sees ONLY their own assignment record and cannot enumerate other writers"
    );

    // 16. Editor can remove an existing assignment
    console.log('\n[Test 15: Remove Writer Assignment]');
    const removeRes = await request(`/api/sections/${testSectionId}/assignments/${writer2User.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(removeRes.status === 200, 'Editor can remove writer from section (200 OK)');

    const verifyRemoval = await request(`/api/sections/${testSectionId}/assignments`, {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    const isStillAssigned = verifyRemoval.data?.assignments?.some((a) => a.writer?.id === writer2User.id);
    assert(!isStillAssigned, 'Writer is no longer present in section assignments');

    // 17. Section Archiving & Preservation
    console.log('\n[Test 16: Section Archiving & Data Preservation]');
    const archiveRes = await request(`/api/sections/${testSectionId}/archive`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(archiveRes.status === 200, 'Editor can archive section (200 OK)');
    assert(archiveRes.data?.section?.isArchived === true, 'Section marked isArchived: true');

    // Archived section cannot receive new assignments
    const assignToArchived = await request(`/api/sections/${testSectionId}/assignments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${editorToken}` },
      body: { writerId: writer2User.id },
    });
    assert(assignToArchived.status === 400, 'Archived section cannot receive new assignments (400 Bad Request)');

    // Archived section excluded from normal writer working list
    const writerListArchived = await request('/api/sections', {
      headers: { Authorization: `Bearer ${writerToken}` },
    });
    const writerSeesArchived = writerListArchived.data.some((s) => s.id === testSectionId);
    assert(!writerSeesArchived, 'Archived section is excluded from writer working list');

    // 18. Section Restoration
    console.log('\n[Test 17: Section Restoration]');
    const restoreRes = await request(`/api/sections/${testSectionId}/restore`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(restoreRes.status === 200, 'Editor can restore archived section (200 OK)');
    assert(restoreRes.data?.section?.isArchived === false, 'Section marked isArchived: false after restore');

    // Assignments preserved through archive and restore
    const postRestoreAssignments = await request(`/api/sections/${testSectionId}/assignments`, {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    const writer1Preserved = postRestoreAssignments.data?.assignments?.some(
      (a) => a.writer?.id === writerUser.id
    );
    assert(writer1Preserved, 'Original writer assignments preserved intact across archive/restore cycle');

    // Clean up temporary test sections
    console.log('\n[Test Cleanup: Removing Test Sections]');
    await prisma.sectionAssignment.deleteMany({ where: { sectionId: { in: [testSectionId, unassignedId] } } });
    await prisma.section.deleteMany({ where: { id: { in: [testSectionId, unassignedId] } } });
    console.log('  Cleaned up temporary test sections cleanly.');

    console.log('\n====================================================');
    const passed = testResults.filter((r) => r.passed).length;
    console.log(`PHASE 3 SECTIONS RESULTS: ${passed}/${testResults.length} checks passed.`);
    console.log('====================================================\n');
  } catch (err) {
    console.error('Unexpected error during test execution:', err);
  } finally {
    if (server) server.close();
    await prisma.$disconnect();
    const allPassed = testResults.length > 0 && testResults.every((r) => r.passed);
    process.exit(allPassed ? 0 : 1);
  }
}

runTests();
