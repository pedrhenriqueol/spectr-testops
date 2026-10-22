import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { randomUUID } from 'node:crypto';
import { prisma } from '../src/shared/prisma.js';
import { executeSingleTestCase, executeTestSuite } from '../src/engine/runner.js';

let server: Server;
let baseUrl: string;
let workspaceId: string;
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
      response.setHeader('Content-Type', 'application/json');
      response.end('{"token":"local-test-token"}');
    } else if (request.url === '/protected') {
      response.writeHead(request.headers.authorization === 'Bearer local-test-token' ? 200 : 401);
      response.end('{}');
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

async function fixture(path: string, options: { schema?: unknown; maxLatencyMs?: number } = {}) {
  return prisma.testSuite.create({
    data: {
      workspaceId, name: 'Regression', baseUrl,
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
