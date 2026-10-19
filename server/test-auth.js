// ==============================================================================
// AUTHENTICATION & AUTHORIZATION AUTOMATED TEST SUITE (PHASE 2)
// File: server/test-auth.js
// Target: Validates auth endpoints, JWT verification, and role guards on Express.
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

async function runTests() {
  console.log('====================================================');
  console.log('STARTING PHASE 2: AUTH & AUTHORIZATION TEST SUITE');
  console.log('====================================================\n');

  // Start temporary server on an ephemeral port
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;

  let editorToken = null;
  let writerToken = null;

  try {
    // 1. Healthcheck
    console.log('[Test 1: Healthcheck]');
    const health = await request('/api/health');
    assert(health.status === 200 && health.data?.status === 'ok', 'Health check responds 200 OK');

    // 2. Demo Accounts
    console.log('\n[Test 2: Demo Accounts Retrieval]');
    const demo = await request('/api/auth/demo-accounts');
    assert(demo.status === 200, 'Demo accounts endpoint responds 200 OK');
    assert(demo.data?.accounts?.length >= 5, 'Returns all seeded demo accounts for reviewers');

    // 3. Login as Editor
    console.log('\n[Test 3: Editor Login]');
    const editorLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'editor@dispatch.com', password: 'password123' },
    });
    assert(editorLogin.status === 200, 'Editor login responds 200 OK');
    assert(!!editorLogin.data?.token, 'Editor login issues valid JWT token');
    assert(editorLogin.data?.user?.role === 'EDITOR', 'Editor user role verified');
    editorToken = editorLogin.data?.token;

    // 4. Login as Writer
    console.log('\n[Test 4: Writer Login]');
    const writerLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'writer@dispatch.com', password: 'password123' },
    });
    assert(writerLogin.status === 200, 'Writer login responds 200 OK');
    assert(!!writerLogin.data?.token, 'Writer login issues valid JWT token');
    assert(writerLogin.data?.user?.role === 'WRITER', 'Writer user role verified');
    writerToken = writerLogin.data?.token;

    // 5. Invalid Password
    console.log('\n[Test 5: Invalid Password Rejection]');
    const badPassword = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'editor@dispatch.com', password: 'wrongpassword' },
    });
    assert(badPassword.status === 401, 'Rejects invalid password with 401 Unauthorized');

    // 6. Non-existent User
    console.log('\n[Test 6: Non-Existent Account]');
    const noUser = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'nonexistent@dispatch.com', password: 'password123' },
    });
    assert(noUser.status === 401, 'Rejects non-existent email with 401 Unauthorized');

    // 7. Unauthenticated Access to /api/auth/me
    console.log('\n[Test 7: Token Enforcement]');
    const unauthMe = await request('/api/auth/me');
    assert(unauthMe.status === 401, 'Rejects unauthenticated /api/auth/me with 401');

    // 8. Invalid Token
    const invalidTokenMe = await request('/api/auth/me', {
      headers: { Authorization: 'Bearer this-is-not-a-valid-token' },
    });
    assert(invalidTokenMe.status === 401, 'Rejects malformed token with 401');

    // 9. Authenticated Profile Retrieval
    console.log('\n[Test 8: Authenticated Profile & Permissions]');
    const authMe = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(authMe.status === 200, 'Authenticated /api/auth/me responds 200 OK');
    assert(authMe.data?.email === 'editor@dispatch.com', 'Returns correct profile data');
    assert(Array.isArray(authMe.data?.ownedSections), 'Returns owned sections for editor');

    // 10. Role-Based Authorization Guard: Editor Route
    console.log('\n[Test 9: Role Guard Enforcement (Editor Route)]');
    const writerAccessEditorRoute = await request('/api/test/editor-only', {
      headers: { Authorization: `Bearer ${writerToken}` },
    });
    assert(writerAccessEditorRoute.status === 403, 'Writer blocked from editor-only route (403 Forbidden)');

    const editorAccessEditorRoute = await request('/api/test/editor-only', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(editorAccessEditorRoute.status === 200, 'Editor granted access to editor-only route (200 OK)');

    // 11. Role-Based Authorization Guard: Writer Route
    console.log('\n[Test 10: Role Guard Enforcement (Writer Route)]');
    const editorAccessWriterRoute = await request('/api/test/writer-only', {
      headers: { Authorization: `Bearer ${editorToken}` },
    });
    assert(editorAccessWriterRoute.status === 403, 'Editor blocked from writer-specific route (403 Forbidden)');

    const writerAccessWriterRoute = await request('/api/test/writer-only', {
      headers: { Authorization: `Bearer ${writerToken}` },
    });
    assert(writerAccessWriterRoute.status === 200, 'Writer granted access to writer-specific route (200 OK)');

    // 12. Security Test: Privilege Escalation Prevention on Register
    console.log('\n[Test 11: Security — Privilege Escalation Prevention]');
    const escalationAttempt = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Hacker User',
        email: 'hacker@dispatch.com',
        password: 'password123',
        role: 'EDITOR', // Attempting to self-assign EDITOR!
      },
    });
    assert(
      escalationAttempt.status === 403,
      'Public registration rejects self-assignment of EDITOR role (403 Forbidden)'
    );

    // 13. Valid Writer Registration
    console.log('\n[Test 12: Public Writer Registration]');
    const testWriterEmail = `newwriter_${Date.now()}@dispatch.com`;
    const validRegister = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'New Test Writer',
        email: testWriterEmail,
        password: 'password123',
      },
    });
    assert(validRegister.status === 201, 'Valid writer registration responds 201 Created');
    assert(validRegister.data?.user?.role === 'WRITER', 'Enforces WRITER role on created user');
    assert(!!validRegister.data?.token, 'Returns session JWT token on registration');

    // 14. Duplicate Email Rejection
    console.log('\n[Test 13: Duplicate Email Rejection]');
    const duplicateRegister = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Duplicate Writer',
        email: testWriterEmail, // Same email
        password: 'password123',
      },
    });
    assert(duplicateRegister.status === 409, 'Rejects duplicate registration with 409 Conflict');

    // Clean up created test user from database
    await prisma.user.delete({ where: { email: testWriterEmail } }).catch(() => {});

    console.log('\n====================================================');
    const passed = testResults.filter((r) => r.passed).length;
    console.log(`PHASE 2 AUTH RESULTS: ${passed}/${testResults.length} checks passed.`);
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

