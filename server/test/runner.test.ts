import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { randomUUID } from 'node:crypto';
import { prisma } from '../src/shared/prisma.js';
import { buildApp } from '../src/app.js';
import { createTestSession } from './auth-helper.js';
import { executeSingleTestCase, executeTestSuite } from '../src/engine/runner.js';

let server: Server;
let baseUrl: string;
let workspaceId: string;
let loginRequests = 0;
before(async () => {
  server = createServer((request, response) => {
    if (request.url === '/slow-body') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.flushHeaders();
      setTimeout(() => response.end('{"ok":true}'), 80);
    } else if (request.url === '/never-ending-body') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.flushHeaders();
    } else if (request.url === '/primitive') response.end('false');
    else if (request.url === '/empty') response.end();
    else if (request.url === '/text') response.end('plain text');
    else if (request.url === '/number') response.end('42');
    else if (request.url === '/auth/login') {
      loginRequests++;
      response.setHeader('Content-Type', 'application/json');
      response.end('{"token":"local-test-token"}');
    } else if (request.url === '/protected') {
      response.writeHead(request.headers.authorization === 'Bearer local-test-token' ? 200 : 401);
      response.end('{}');
    } else if (request.url?.startsWith('/draft-echo')) {
      let body = '';
      request.setEncoding('utf8');
      request.on('data', (chunk: string) => { body += chunk; });
      request.on('end', () => {
        response.writeHead(201, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ method: request.method, url: request.url, headers: request.headers, body }));
      });
    } else response.end('{"ok":true}');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const workspace = await prisma.workspace.create({ data: { name: 'Runner regression', slug: randomUUID(), apiKey: randomUUID() } });
  workspaceId = workspace.id;
});
after(async () => {
  server?.closeAllConnections();
  if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
  if (workspaceId) await prisma.workspace.delete({ where: { id: workspaceId } });
  await prisma.$disconnect();
});

async function fixture(path: string, options: { schema?: unknown; maxLatencyMs?: number; workspaceId?: string } = {}) {
  return prisma.testSuite.create({
    data: {
      workspaceId: options.workspaceId ?? workspaceId, name: 'Regression', baseUrl,
      cases: { create: {
        name: 'Local case', method: 'GET', path, expectedStatus: 200,
        maxLatencyMs: options.maxLatencyMs ?? 5000,
        expectedSchema: options.schema === undefined ? null : JSON.stringify(options.schema)
      } }
    }, include: { cases: true }
  });
}

test('complete response body contributes to latency and failing SLA fails the collection', async () => {
  const suite = await fixture('/slow-body', { maxLatencyMs: 10 });
  const result = await executeTestSuite(suite.id, workspaceId);
  assert.equal(result.status, 'FAILED');
  assert.equal(result.passedTests, 0);
  assert.equal(result.failedTests, 1);
  assert.equal(result.successRate, 0);
  assert.ok(result.p95LatencyMs >= 60);
  const assertions = await prisma.testAssertion.findMany({ where: { runId: result.runId } });
  assert.equal(assertions.length, 1);
  assert.equal(assertions[0].statusMatch, true);
  assert.equal(assertions[0].slaPassed, false);
  assert.match(assertions[0].errorMessage!, /SLA/);
});

test('single and suite contract checks cover empty, text and primitive JSON responses', async () => {
  for (const [path, schema, expected] of [
    ['/empty', { type: 'object' }, false],
    ['/text', { type: 'object' }, false],
    ['/primitive', { type: 'object' }, false],
    ['/primitive', { type: 'boolean' }, true],
    ['/number', { type: 'number' }, true],
    ['/number', false, false]
  ] as const) {
    const suite = await fixture(path, { schema });
    const single = await executeSingleTestCase(suite.cases[0].id);
    assert.equal(single.schemaValid, expected, `single ${path} ${JSON.stringify(schema)}`);
    const collection = await executeTestSuite(suite.id, workspaceId);
    assert.equal(collection.status, expected ? 'PASSED' : 'FAILED', `suite ${path} ${JSON.stringify(schema)}`);
  }
});

test('runtime baseUrl override is used without modifying stored collection', async () => {
  const suite = await fixture('/number');
  await prisma.testSuite.update({ where: { id: suite.id }, data: { baseUrl: 'http://127.0.0.1:1' } });
  const single = await executeSingleTestCase(suite.cases[0].id, baseUrl);
  assert.equal(single.actualStatus, 200);
  const run = await executeTestSuite(suite.id, workspaceId, 'TEST', baseUrl);
  assert.equal(run.status, 'PASSED');
  assert.equal((await prisma.testSuite.findUniqueOrThrow({ where: { id: suite.id } })).baseUrl, 'http://127.0.0.1:1');
});

test('suite token chaining and single auto-login still reach protected endpoints', async () => {
  const suite = await prisma.testSuite.create({
    data: { workspaceId, name: 'Token chain', baseUrl, cases: { create: [
      { name: 'Login', method: 'POST', path: '/auth/login', body: '{}', orderIndex: 0, maxLatencyMs: 5000 },
      { name: 'Protected', method: 'GET', path: '/protected', orderIndex: 1, maxLatencyMs: 5000 }
    ] } }, include: { cases: { orderBy: { orderIndex: 'asc' } } }
  });
  assert.equal((await executeTestSuite(suite.id, workspaceId)).status, 'PASSED');
  assert.equal((await executeSingleTestCase(suite.cases[1].id)).actualStatus, 200);
  assert.equal((await executeSingleTestCase(suite.cases[1].id, undefined, { headers: { 'X-Draft': 'preview' } })).actualStatus, 200);
});

test('inferred login tokens stay on the login origin for suites and draft executions', async () => {
  const foreignServer = createServer((request, response) => {
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ authorization: request.headers.authorization ?? null }));
  });
  await new Promise<void>((resolve) => foreignServer.listen(0, '127.0.0.1', resolve));
  const foreignUrl = `http://127.0.0.1:${(foreignServer.address() as AddressInfo).port}/foreign`;
  try {
    const suite = await prisma.testSuite.create({
      data: { workspaceId, name: 'Origin scoped token', baseUrl, cases: { create: [
        { name: 'Login', method: 'POST', path: '/auth/login', body: '{}', orderIndex: 0, maxLatencyMs: 5000 },
        { name: 'Target', method: 'GET', path: '/protected', orderIndex: 1, maxLatencyMs: 5000 }
      ] } }, include: { cases: { orderBy: { orderIndex: 'asc' } } }
    });
    const before = loginRequests;
    const draft = await executeSingleTestCase(suite.cases[1].id, undefined, { path: foreignUrl });
    assert.equal(draft.actualStatus, 200);
    assert.deepEqual(draft.responseBody, { authorization: null });
    assert.equal(loginRequests, before, 'A foreign draft must not trigger automatic login');
    await prisma.testCase.update({ where: { id: suite.cases[1].id }, data: { path: foreignUrl } });
    const run = await executeTestSuite(suite.id, workspaceId);
    assert.equal(run.status, 'PASSED');
    const assertion = await prisma.testAssertion.findFirstOrThrow({ where: { runId: run.runId, caseId: suite.cases[1].id } });
    assert.deepEqual(JSON.parse(assertion.responseBody!), { authorization: null });
  } finally {
    foreignServer.closeAllConnections();
    await new Promise<void>((resolve) => foreignServer.close(() => resolve()));
  }
});

test('draft execution applies request fields, inherits suite headers and never persists edits', async () => {
  const suite = await fixture('/number');
  await prisma.testSuite.update({ where: { id: suite.id }, data: {
    headers: JSON.stringify({ 'X-Global': 'suite', 'X-Shared': 'suite' })
  } });
  const stored = await prisma.testCase.update({ where: { id: suite.cases[0].id }, data: {
    headers: JSON.stringify({ 'X-Saved': 'original' })
  } });
  const result = await executeSingleTestCase(stored.id, undefined, {
    method: 'POST', path: '/draft-echo?source=preview', headers: { 'X-Draft': 'temporary', 'X-Shared': 'draft' },
    body: 0, expectedStatus: 201, maxLatencyMs: 4000,
    expectedSchema: { type: 'object', required: ['method', 'body'] }
  });
  assert.equal(result.method, 'POST');
  assert.equal(result.expectedStatus, 201);
  assert.equal(result.statusMatch, true);
  assert.equal(result.schemaValid, true);
  assert.equal(result.maxLatencyMs, 4000);
  assert.match(result.url, /draft-echo\?source=preview$/);
  const echoed = result.responseBody as { method: string; body: string; headers: Record<string, string> };
  assert.equal(echoed.method, 'POST');
  assert.equal(echoed.body, '0');
  assert.equal(echoed.headers['x-global'], 'suite');
  assert.equal(echoed.headers['x-shared'], 'draft');
  assert.equal(echoed.headers['x-draft'], 'temporary');
  assert.equal(echoed.headers['x-saved'], undefined);
  assert.deepEqual(await prisma.testCase.findUniqueOrThrow({ where: { id: stored.id } }), stored);
  assert.equal(await prisma.testRun.count({ where: { suiteId: suite.id } }), 0);
});

test('null draft overrides clear case headers, body and schema without clearing suite defaults', async () => {
  const suite = await fixture('/draft-echo', { schema: false });
  await prisma.testSuite.update({ where: { id: suite.id }, data: { headers: JSON.stringify({ 'X-Global': 'retained' }) } });
  const stored = await prisma.testCase.update({ where: { id: suite.cases[0].id }, data: {
    method: 'POST', headers: JSON.stringify({ 'X-Saved': 'remove-in-draft' }), body: '{"saved":true}', expectedStatus: 201
  } });
  const result = await executeSingleTestCase(stored.id, undefined, { headers: null, body: null, expectedSchema: null });
  assert.equal(result.statusMatch, true);
  assert.equal(result.schemaValid, true);
  const echoed = result.responseBody as { body: string; headers: Record<string, string> };
  assert.equal(echoed.body, '');
  assert.equal(echoed.headers['x-saved'], undefined);
  assert.equal(echoed.headers['x-global'], 'retained');
  assert.deepEqual(await prisma.testCase.findUniqueOrThrow({ where: { id: stored.id } }), stored);
});

test('single run API validates and executes drafts without saving them', async () => {
  const app = buildApp();
  const session = await createTestSession(app);
  const suite = await fixture('/number', { workspaceId: session.workspaceId });
  const stored = suite.cases[0];
  try {
    for (const body of [false, 0, null, 'null']) {
      const response = await app.inject({
        method: 'POST', headers: session.headers, url: `/api/v1/cases/${stored.id}/run`, payload: { baseUrl, overrides: {
          method: 'POST', path: '/draft-echo', body, expectedStatus: 201, expectedSchema: { type: 'object' }
        } }
      });
      assert.equal(response.statusCode, 200, response.body);
      assert.equal(response.json().statusMatch, true);
      assert.equal(response.json().responseBody.body, body === null ? '' : typeof body === 'string' ? body : JSON.stringify(body));
    }
    const deniedContract = await app.inject({
      method: 'POST', headers: session.headers, url: `/api/v1/cases/${stored.id}/run`, payload: { overrides: { expectedSchema: false } }
    });
    assert.equal(deniedContract.statusCode, 200);
    assert.equal(deniedContract.json().schemaValid, false);
    for (const overrides of [
      { method: 'TRACE' }, { path: 'file:///tmp/forbidden' }, { expectedStatus: 0 }, { maxLatencyMs: 0 },
      { headers: [] }, { expectedSchema: [] }, { active: false }
    ]) {
      const invalid = await app.inject({ method: 'POST', headers: session.headers, url: `/api/v1/cases/${stored.id}/run`, payload: { overrides } });
      assert.equal(invalid.statusCode, 400, JSON.stringify(overrides));
    }
    assert.deepEqual(await prisma.testCase.findUniqueOrThrow({ where: { id: stored.id } }), stored);
  } finally {
    await prisma.workspace.delete({ where: { id: session.workspaceId } });
    await prisma.user.delete({ where: { id: session.user.id } });
    await app.close();
  }
});

test('empty collections and nonexistent cases produce actionable application errors', async () => {
  const suite = await prisma.testSuite.create({ data: { workspaceId, name: 'Empty', baseUrl } });
  await assert.rejects(() => executeTestSuite(suite.id, workspaceId), { statusCode: 400 });
  assert.equal(await prisma.testRun.count({ where: { suiteId: suite.id } }), 0);
  await assert.rejects(() => executeSingleTestCase(randomUUID()), { statusCode: 404 });
});

test('network timeout covers a body that never completes after headers', { timeout: 20000 }, async () => {
  const suite = await fixture('/never-ending-body');
  const result = await executeSingleTestCase(suite.cases[0].id);
  assert.equal(result.actualStatus, 0);
  assert.equal(result.statusText, 'Network Timeout');
  assert.ok(result.latencyMs >= 14000);
  assert.match(result.errorMessage!, /Timeout/);
});
