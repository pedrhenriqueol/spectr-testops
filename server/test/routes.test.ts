import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import type { FastifyInstance, InjectOptions } from 'fastify';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/shared/prisma.js';
import { createTestSession } from './auth-helper.js';

describe('API validation and persistence', { concurrency: false }, () => {
  let app: FastifyInstance;
  let workspaceId: string;
  let suiteId: string;
  let userId: string;
  let headers: Record<string, string>;

  const authenticatedInject = (options: InjectOptions | string) => app.inject(typeof options === 'string'
    ? { url: options, headers }
    : { ...options, headers: { ...headers, ...options.headers } });

  before(async () => {
    app = await buildApp();
    await app.ready();
  });

  beforeEach(async () => {
    const session = await createTestSession(app);
    workspaceId = session.workspaceId;
    userId = session.user.id;
    headers = session.headers;
    const suite = await prisma.testSuite.create({
      data: { workspaceId, name: 'Local suite', baseUrl: 'http://127.0.0.1:1' }
    });
    suiteId = suite.id;
  });

  afterEach(async () => {
    await prisma.workspace.delete({ where: { id: workspaceId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  after(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('requires a session for suites, case mutations, executions, history and metrics', async () => {
    const caseId = randomUUID();
    for (const request of [
      { method: 'GET' as const, url: '/api/v1/suites/' },
      { method: 'POST' as const, url: '/api/v1/suites/', payload: { name: 'Unauthenticated suite', baseUrl: 'http://127.0.0.1:1' } },
      { method: 'PATCH' as const, url: `/api/v1/suites/${suiteId}`, payload: { name: 'Unauthenticated change' } },
      { method: 'DELETE' as const, url: `/api/v1/suites/${suiteId}` },
      { method: 'POST' as const, url: `/api/v1/suites/${suiteId}/cases`, payload: { name: 'Unauthenticated case', method: 'GET', path: '/' } },
      { method: 'PATCH' as const, url: `/api/v1/suites/${suiteId}/cases/${caseId}`, payload: { name: 'Unauthenticated change' } },
      { method: 'DELETE' as const, url: `/api/v1/suites/${suiteId}/cases/${caseId}` },
      { method: 'POST' as const, url: `/api/v1/suites/${suiteId}/run` },
      { method: 'POST' as const, url: `/api/v1/cases/${caseId}/run` },
      { method: 'GET' as const, url: '/api/v1/runs' },
      { method: 'GET' as const, url: `/api/v1/runs/${randomUUID()}` },
      { method: 'GET' as const, url: '/api/v1/metrics/overview' }
    ]) {
      const response = await app.inject(request);
      assert.equal(response.statusCode, 401, `${request.method} ${request.url}: ${response.body}`);
    }
    assert.ok(await prisma.testSuite.findUnique({ where: { id: suiteId } }));
  });

  it('isolates tenant data and rejects selecting a non-member workspace', async () => {
    const other = await createTestSession(app);
    try {
      const foreignSuite = await prisma.testSuite.create({ data: { workspaceId: other.workspaceId, name: 'Private suite', baseUrl: 'http://127.0.0.1:1' } });
      const foreignCase = await prisma.testCase.create({ data: { suiteId: foreignSuite.id, name: 'Private case', method: 'GET', path: '/' } });
      const foreignRun = await prisma.testRun.create({ data: { workspaceId: other.workspaceId, suiteId: foreignSuite.id, status: 'FAILED' } });

      const suites = await authenticatedInject('/api/v1/suites/');
      assert.equal(suites.statusCode, 200);
      assert.deepEqual(suites.json().suites.map((suite: { id: string }) => suite.id), [suiteId]);
      assert.deepEqual((await authenticatedInject('/api/v1/runs')).json().runs, []);
      const metrics = (await authenticatedInject('/api/v1/metrics/overview')).json().metrics;
      assert.equal(metrics.totalSuites, 1);
      assert.equal(metrics.totalCases, 0);
      assert.equal(metrics.totalRuns, 0);

      for (const request of [
        { method: 'PATCH' as const, url: `/api/v1/suites/${foreignSuite.id}`, payload: { name: 'Forbidden change' } },
        { method: 'DELETE' as const, url: `/api/v1/suites/${foreignSuite.id}` },
        { method: 'POST' as const, url: `/api/v1/suites/${foreignSuite.id}/cases`, payload: { name: 'Forbidden case', method: 'GET', path: '/' } },
        { method: 'PATCH' as const, url: `/api/v1/suites/${foreignSuite.id}/cases/${foreignCase.id}`, payload: { name: 'Forbidden change' } },
        { method: 'DELETE' as const, url: `/api/v1/suites/${foreignSuite.id}/cases/${foreignCase.id}` },
        { method: 'POST' as const, url: `/api/v1/suites/${foreignSuite.id}/run` },
        { method: 'POST' as const, url: `/api/v1/cases/${foreignCase.id}/run` },
        { method: 'GET' as const, url: `/api/v1/runs/${foreignRun.id}` }
      ]) {
        const response = await authenticatedInject(request);
        assert.equal(response.statusCode, 404, `${request.method} ${request.url}: ${response.body}`);
      }
      for (const url of ['/api/v1/suites/', '/api/v1/runs', '/api/v1/metrics/overview']) {
        const response = await app.inject({ url, headers: { ...headers, 'x-workspace-id': other.workspaceId } });
        assert.equal(response.statusCode, 403, url);
        assert.equal((await authenticatedInject(`${url}?workspaceId=${other.workspaceId}`)).statusCode, 403);
      }
      const unauthorizedCreate = await authenticatedInject({
        method: 'POST', url: '/api/v1/suites/',
        payload: { workspaceId: other.workspaceId, name: 'Forbidden suite', baseUrl: 'http://127.0.0.1:1' }
      });
      assert.equal(unauthorizedCreate.statusCode, 403);
      assert.equal((await prisma.testSuite.findUniqueOrThrow({ where: { id: foreignSuite.id } })).name, 'Private suite');
      assert.ok(await prisma.testCase.findUnique({ where: { id: foreignCase.id } }));
      assert.equal(await prisma.testRun.count({ where: { workspaceId: other.workspaceId } }), 1);
    } finally {
      await prisma.workspace.delete({ where: { id: other.workspaceId } });
      await prisma.user.delete({ where: { id: other.user.id } });
    }
  });

  it('rejects invalid case inputs before persistence', async () => {
    const payload = { name: 'Echo', method: 'GET', path: '/echo' };
    for (const invalid of [
      { expectedStatus: 999 },
      { expectedStatus: 200.5 },
      { maxLatencyMs: -1 },
      { maxLatencyMs: 2.5 },
      { active: 'false' },
      { orderIndex: -1 },
      { orderIndex: 2147483648 },
      { path: ' ' },
      { path: 'file:///etc/passwd' },
      { expectedSchema: [] }
    ]) {
      const response = await authenticatedInject({
        method: 'POST', url: `/api/v1/suites/${suiteId}/cases`, payload: { ...payload, ...invalid }
      });
      assert.equal(response.statusCode, 400, JSON.stringify(invalid));
    }
    assert.equal(await prisma.testCase.count({ where: { suiteId } }), 0);
  });

  it('preserves false, zero and null JSON request bodies and boolean schemas', async () => {
    for (const body of [false, 0, null]) {
      const response = await authenticatedInject({
        method: 'POST', url: `/api/v1/suites/${suiteId}/cases`,
        payload: { name: 'JSON payload', method: 'POST', path: '/echo', body, expectedSchema: false }
      });
      assert.equal(response.statusCode, 201, response.body);
      assert.equal(response.json().testCase.body, JSON.stringify(body));
      assert.equal(response.json().testCase.expectedSchema, 'false');
    }
  });

  it('partially edits a case without resetting omitted request or assertion fields', async () => {
    const created = await authenticatedInject({
      method: 'POST', url: `/api/v1/suites/${suiteId}/cases`,
      payload: {
        name: 'Saved endpoint', method: 'POST', path: '/original', headers: { 'X-Test': 'saved' },
        body: { original: true }, expectedStatus: 201, maxLatencyMs: 1234,
        expectedSchema: { type: 'object', required: ['original'] }, active: true, orderIndex: 3
      }
    });
    assert.equal(created.statusCode, 201, created.body);
    const original = created.json().testCase;
    assert.equal(original.active, true);
    assert.equal(original.orderIndex, 3);

    const response = await authenticatedInject({
      method: 'PATCH', url: `/api/v1/suites/${suiteId}/cases/${original.id}`,
      payload: { name: 'Renamed endpoint', active: false, orderIndex: 5 }
    });
    assert.equal(response.statusCode, 200, response.body);
    const updated = response.json().testCase;
    assert.equal(updated.name, 'Renamed endpoint');
    assert.equal(updated.active, false);
    assert.equal(updated.orderIndex, 5);
    for (const field of ['method', 'path', 'headers', 'body', 'expectedStatus', 'maxLatencyMs', 'expectedSchema']) {
      assert.deepEqual(updated[field], original[field], `${field} must remain unchanged when omitted`);
    }
  });

  it('appends new cases after the highest saved order even after edits and deletions', async () => {
    const first = await authenticatedInject({
      method: 'POST', url: `/api/v1/suites/${suiteId}/cases`,
      payload: { name: 'Reordered endpoint', method: 'GET', path: '/', orderIndex: 7 }
    });
    assert.equal(first.statusCode, 201);
    const second = await authenticatedInject({
      method: 'POST', url: `/api/v1/suites/${suiteId}/cases`, payload: { name: 'Appended endpoint', method: 'GET', path: '/' }
    });
    assert.equal(second.statusCode, 201);
    assert.equal(second.json().testCase.orderIndex, 8);
    assert.equal((await authenticatedInject({ method: 'DELETE', url: `/api/v1/suites/${suiteId}/cases/${first.json().testCase.id}` })).statusCode, 204);
    const third = await authenticatedInject({
      method: 'POST', url: `/api/v1/suites/${suiteId}/cases`, payload: { name: 'Next endpoint', method: 'GET', path: '/' }
    });
    assert.equal(third.statusCode, 201);
    assert.equal(third.json().testCase.orderIndex, 9);
  });

  it('serializes edited false/zero values and clears JSON fields only for explicit null', async () => {
    const testCase = await prisma.testCase.create({
      data: {
        suiteId, name: 'Editable payload', method: 'POST', path: '/echo',
        headers: '{"X-Test":"old"}', body: '{"old":true}', expectedSchema: '{"type":"object"}'
      }
    });
    const url = `/api/v1/suites/${suiteId}/cases/${testCase.id}`;
    for (const body of [false, 0, { changed: true }]) {
      const response = await authenticatedInject({
        method: 'PATCH', url,
        payload: { body, headers: { 'Content-Type': 'application/json' }, expectedSchema: false, orderIndex: 0 }
      });
      assert.equal(response.statusCode, 200, response.body);
      const saved = await prisma.testCase.findUniqueOrThrow({ where: { id: testCase.id } });
      assert.equal(saved.body, JSON.stringify(body));
      assert.equal(saved.headers, '{"Content-Type":"application/json"}');
      assert.equal(saved.expectedSchema, 'false');
      assert.equal(saved.orderIndex, 0);
    }

    const cleared = await authenticatedInject({ method: 'PATCH', url, payload: { body: null, headers: null, expectedSchema: null } });
    assert.equal(cleared.statusCode, 200, cleared.body);
    const saved = await prisma.testCase.findUniqueOrThrow({ where: { id: testCase.id } });
    assert.equal(saved.body, null);
    assert.equal(saved.headers, null);
    assert.equal(saved.expectedSchema, null);
    assert.equal(saved.method, 'POST');
    assert.equal(saved.path, '/echo');
  });

  it('rejects invalid case edits and execution overrides without modifying the saved case', async () => {
    const testCase = await prisma.testCase.create({ data: { suiteId, name: 'Unchanged endpoint', method: 'GET', path: '/echo' } });
    for (const payload of [
      { name: ' ' }, { method: 'TRACE' }, { path: 'file:///etc/passwd' },
      { headers: { 'X-Test': 12 } }, { expectedStatus: '200' }, { maxLatencyMs: 0 },
      { expectedSchema: [] }, { active: 'false' }, { orderIndex: -1 }, { orderIndex: 1.5 }, { orderIndex: 2147483648 }
    ]) {
      const response = await authenticatedInject({ method: 'PATCH', url: `/api/v1/suites/${suiteId}/cases/${testCase.id}`, payload });
      assert.equal(response.statusCode, 400, JSON.stringify(payload));
    }
    for (const overrides of [{ method: 'TRACE' }, { expectedStatus: 999 }, { headers: [] }, { maxLatencyMs: -1 }]) {
      const response = await authenticatedInject({ method: 'POST', url: `/api/v1/cases/${testCase.id}/run`, payload: { overrides } });
      assert.equal(response.statusCode, 400, JSON.stringify(overrides));
    }
    const saved = await prisma.testCase.findUniqueOrThrow({ where: { id: testCase.id } });
    assert.equal(saved.name, 'Unchanged endpoint');
    assert.equal(saved.method, 'GET');
    assert.equal(saved.expectedStatus, 200);
    assert.equal(saved.orderIndex, 0);
  });

  it('prevents editing or deleting another suite\'s case and validates both route IDs', async () => {
    const otherSuite = await prisma.testSuite.create({ data: { workspaceId, name: 'Other suite', baseUrl: 'http://127.0.0.1:1' } });
    const testCase = await prisma.testCase.create({ data: { suiteId, name: 'Owned endpoint', method: 'GET', path: '/echo' } });
    for (const method of ['PATCH', 'DELETE'] as const) {
      for (const targetSuiteId of [otherSuite.id, randomUUID()]) {
        const response = await authenticatedInject({
          method, url: `/api/v1/suites/${targetSuiteId}/cases/${testCase.id}`,
          ...(method === 'PATCH' ? { payload: { name: 'Forbidden change' } } : {})
        });
        assert.equal(response.statusCode, 404, response.body);
      }
      for (const url of [`/api/v1/suites/invalid/cases/${testCase.id}`, `/api/v1/suites/${suiteId}/cases/invalid`]) {
        const response = await authenticatedInject({ method, url, ...(method === 'PATCH' ? { payload: { name: 'Invalid route' } } : {}) });
        assert.equal(response.statusCode, 400, response.body);
      }
    }
    assert.equal((await prisma.testCase.findUniqueOrThrow({ where: { id: testCase.id } })).name, 'Owned endpoint');
  });

  it('deletes an owned case and cascades its assertions while preserving the run', async () => {
    const testCase = await prisma.testCase.create({ data: { suiteId, name: 'Deleted endpoint', method: 'GET', path: '/echo' } });
    const run = await prisma.testRun.create({ data: { workspaceId, suiteId, status: 'PASSED', totalTests: 1, passedTests: 1 } });
    const assertion = await prisma.testAssertion.create({
      data: { runId: run.id, caseId: testCase.id, name: testCase.name, method: 'GET', endpoint: '/echo', actualStatus: 200, expectedStatus: 200, statusMatch: true }
    });
    const url = `/api/v1/suites/${suiteId}/cases/${testCase.id}`;
    const response = await authenticatedInject({ method: 'DELETE', url });
    assert.equal(response.statusCode, 204, response.body);
    assert.equal(response.body, '');
    assert.equal(await prisma.testCase.findUnique({ where: { id: testCase.id } }), null);
    assert.equal(await prisma.testAssertion.findUnique({ where: { id: assertion.id } }), null);
    assert.ok(await prisma.testRun.findUnique({ where: { id: run.id } }));
    assert.equal((await authenticatedInject({ method: 'DELETE', url })).statusCode, 404);
    assert.equal((await authenticatedInject({ method: 'PATCH', url, payload: { name: 'Missing endpoint' } })).statusCode, 404);
  });

  it('reports missing suites and cases as 404 instead of database errors', async () => {
    const missing = randomUUID();
    const requests = [
      { method: 'POST' as const, url: `/api/v1/suites/${missing}/cases`, payload: { name: 'Missing suite', method: 'GET', path: '/' } },
      { method: 'PATCH' as const, url: `/api/v1/suites/${missing}`, payload: { name: 'Missing suite' } },
      { method: 'DELETE' as const, url: `/api/v1/suites/${missing}` },
      { method: 'POST' as const, url: `/api/v1/cases/${missing}/run` }
    ];
    for (const request of requests) {
      const response = await authenticatedInject(request);
      assert.equal(response.statusCode, 404, `${request.method} ${request.url}: ${response.body}`);
    }
  });

  it('restricts base URLs and execution overrides to HTTP(S)', async () => {
    for (const invalidUrl of ['file:///etc/passwd', 'not a URL']) {
      for (const request of [
        { method: 'POST' as const, url: '/api/v1/suites/', payload: { name: 'Invalid URL', baseUrl: invalidUrl } },
        { method: 'PATCH' as const, url: `/api/v1/suites/${suiteId}`, payload: { baseUrl: invalidUrl } },
        { method: 'POST' as const, url: `/api/v1/suites/${suiteId}/run`, payload: { baseUrl: invalidUrl } },
        { method: 'POST' as const, url: `/api/v1/cases/${randomUUID()}/run`, payload: { baseUrl: invalidUrl } }
      ]) {
        const response = await authenticatedInject(request);
        assert.equal(response.statusCode, 400, `${request.url}: ${response.body}`);
      }
    }
    assert.equal((await prisma.testSuite.findUniqueOrThrow({ where: { id: suiteId } })).baseUrl, 'http://127.0.0.1:1');
  });

  it('applies workspace filters, bounded history limits and completed-only metric averages', async () => {
    await prisma.testRun.createMany({
      data: [
        { workspaceId, suiteId, status: 'PASSED', successRate: 75, p95LatencyMs: 100, createdAt: new Date('2026-01-01T00:00:00Z') },
        { workspaceId, suiteId, status: 'FAILED', successRate: 25, p95LatencyMs: 300, createdAt: new Date('2026-01-02T00:00:00Z') },
        { workspaceId, suiteId, status: 'RUNNING', createdAt: new Date('2026-01-03T00:00:00Z') }
      ]
    });

    const suitesResponse = await authenticatedInject(`/api/v1/suites/?workspaceId=${workspaceId}`);
    assert.equal(suitesResponse.statusCode, 200);
    assert.deepEqual(suitesResponse.json().suites.map((suite: { id: string }) => suite.id), [suiteId]);

    const historyResponse = await authenticatedInject(`/api/v1/runs?workspaceId=${workspaceId}&limit=1`);
    assert.equal(historyResponse.statusCode, 200);
    assert.equal(historyResponse.json().runs.length, 1);
    assert.equal(historyResponse.json().runs[0].status, 'RUNNING');

    const invalidWorkspaceHistory = await authenticatedInject(`/api/v1/runs?workspaceId=${randomUUID()}`);
    assert.equal(invalidWorkspaceHistory.statusCode, 403);

    for (const limit of ['0', '-1', '101', 'abc', '1.5']) {
      assert.equal((await authenticatedInject(`/api/v1/runs?limit=${limit}`)).statusCode, 400);
    }

    const metricsResponse = await authenticatedInject(`/api/v1/metrics/overview?workspaceId=${workspaceId}`);
    const metrics = metricsResponse.json().metrics;
    assert.equal(metricsResponse.statusCode, 200);
    assert.equal(metrics.totalSuites, 1);
    assert.equal(metrics.totalRuns, 3);
    assert.equal(metrics.avgSuccessRate, '50%');
    assert.equal(metrics.avgP95LatencyMs, '200ms');
    assert.equal(metrics.recentRuns.length, 2);
  });
});

describe('Chaos simulation inputs and delays', () => {
  let app: FastifyInstance;

  before(async () => {
    app = await buildApp();
    await app.ready();
  });

  after(async () => { await app.close(); });

  it('never reflects session cookies or credentials through the public echo', async () => {
    const credential = `private-fixture-${randomUUID()}`;
    const response = await app.inject({ method: 'GET', url: '/api/v1/chaos/echo', headers: {
      cookie: `spectr_session=${credential}`, authorization: `Bearer ${credential}`,
      'proxy-authorization': credential, 'x-api-key': credential, 'x-custom-token': credential, 'x-fixture': 'visible'
    } });
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.includes(credential), false);
    for (const name of ['cookie', 'authorization', 'proxy-authorization', 'x-api-key', 'x-custom-token']) {
      assert.equal(response.json().headers[name], undefined, name);
    }
    assert.equal(response.json().headers['x-fixture'], 'visible');
    assert.equal(response.json().method, 'GET');
  });

  it('accepts an explicit zero delay without applying the two-second default', async () => {
    const started = performance.now();
    const response = await app.inject('/api/v1/chaos/simulate-delay?delay=0');
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().delayInjectedMs, 0);
    assert.ok(performance.now() - started < 1500);
  });

  it('waits for a POST body delay after the incoming request has completed', async () => {
    const started = performance.now();
    const response = await app.inject({ method: 'POST', url: '/api/v1/chaos/simulate-delay', payload: { delay: 60 } });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().delayInjectedMs, 60);
    assert.ok(performance.now() - started >= 45, 'The response must wait for the requested delay');
  });

  it('rejects malformed or out-of-range delay and error status inputs', async () => {
    for (const query of ['delay=abc', 'delay=-1', 'delay=30001', 'delay=0.5']) {
      assert.equal((await app.inject(`/api/v1/chaos/simulate-delay?${query}`)).statusCode, 400);
    }
    for (const code of ['200', '600', 'abc', '500.5']) {
      assert.equal((await app.inject(`/api/v1/chaos/simulate-error?code=${code}`)).statusCode, 400);
    }
    const response = await app.inject('/api/v1/chaos/simulate-error?code=429');
    assert.equal(response.statusCode, 429);
    assert.equal(response.json().error, 'Too Many Requests');
  });
});
