import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/shared/prisma.js';

describe('API validation and persistence', { concurrency: false }, () => {
  let app: FastifyInstance;
  let workspaceId: string;
  let suiteId: string;

  before(async () => {
    app = await buildApp();
    await app.ready();
  });

  beforeEach(async () => {
    const id = randomUUID();
    const workspace = await prisma.workspace.create({
      data: { name: 'Route tests', slug: `routes-${id}`, apiKey: `test-${id}` }
    });
    workspaceId = workspace.id;
    const suite = await prisma.testSuite.create({
      data: { workspaceId, name: 'Local suite', baseUrl: 'http://127.0.0.1:1' }
    });
    suiteId = suite.id;
  });

  afterEach(async () => {
    await prisma.workspace.delete({ where: { id: workspaceId } });
  });

  after(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('rejects invalid case inputs before persistence', async () => {
    const payload = { name: 'Echo', method: 'GET', path: '/echo' };
    for (const invalid of [
      { expectedStatus: 999 },
      { expectedStatus: 200.5 },
      { maxLatencyMs: -1 },
      { maxLatencyMs: 2.5 },
      { path: ' ' },
      { path: 'file:///etc/passwd' },
      { expectedSchema: [] }
    ]) {
      const response = await app.inject({
        method: 'POST', url: `/api/v1/suites/${suiteId}/cases`, payload: { ...payload, ...invalid }
      });
      assert.equal(response.statusCode, 400, JSON.stringify(invalid));
    }
    assert.equal(await prisma.testCase.count({ where: { suiteId } }), 0);
  });

  it('preserves false, zero and null JSON request bodies and boolean schemas', async () => {
    for (const body of [false, 0, null]) {
      const response = await app.inject({
        method: 'POST', url: `/api/v1/suites/${suiteId}/cases`,
        payload: { name: 'JSON payload', method: 'POST', path: '/echo', body, expectedSchema: false }
      });
      assert.equal(response.statusCode, 201, response.body);
      assert.equal(response.json().testCase.body, JSON.stringify(body));
      assert.equal(response.json().testCase.expectedSchema, 'false');
    }
  });

  it('reports missing suites and workspaces as 404 instead of database errors', async () => {
    const missing = randomUUID();
    const requests = [
      { method: 'POST' as const, url: '/api/v1/suites/', payload: { workspaceId: missing, name: 'Missing workspace', baseUrl: 'http://127.0.0.1' } },
      { method: 'POST' as const, url: `/api/v1/suites/${missing}/cases`, payload: { name: 'Missing suite', method: 'GET', path: '/' } },
      { method: 'PATCH' as const, url: `/api/v1/suites/${missing}`, payload: { name: 'Missing suite' } },
      { method: 'DELETE' as const, url: `/api/v1/suites/${missing}` },
      { method: 'POST' as const, url: `/api/v1/cases/${missing}/run` }
    ];
    for (const request of requests) {
      const response = await app.inject(request);
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
        const response = await app.inject(request);
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

    const suitesResponse = await app.inject(`/api/v1/suites/?workspaceId=${workspaceId}`);
    assert.equal(suitesResponse.statusCode, 200);
    assert.deepEqual(suitesResponse.json().suites.map((suite: { id: string }) => suite.id), [suiteId]);

    const historyResponse = await app.inject(`/api/v1/runs?workspaceId=${workspaceId}&limit=1`);
    assert.equal(historyResponse.statusCode, 200);
    assert.equal(historyResponse.json().runs.length, 1);
    assert.equal(historyResponse.json().runs[0].status, 'RUNNING');

    const emptyHistory = await app.inject(`/api/v1/runs?workspaceId=${randomUUID()}`);
    assert.deepEqual(emptyHistory.json().runs, []);

    for (const limit of ['0', '-1', '101', 'abc', '1.5']) {
      assert.equal((await app.inject(`/api/v1/runs?limit=${limit}`)).statusCode, 400);
    }

    const metricsResponse = await app.inject(`/api/v1/metrics/overview?workspaceId=${workspaceId}`);
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
