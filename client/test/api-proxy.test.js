import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { createApiProxy } from '../server/api-proxy.js';

let upstream;
let origin;
const requests = [];
const servers = [];

async function listen(handler) {
  const server = createServer(handler);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  servers.push(server);
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}

function call(url, { method = 'GET', headers = {}, body = '' } = {}) {
  return new Promise((resolve, reject) => {
    const outgoing = request(url, { method, headers }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('error', reject);
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks).toString() }));
    });
    outgoing.on('error', reject);
    outgoing.end(body);
  });
}

async function proxyFor(env, options = {}) {
  return listen(createApiProxy({ env: { NODE_ENV: 'test', ...env }, ...options }));
}

before(async () => {
  ({ server: upstream, url: origin } = await listen(async (incoming, response) => {
    const chunks = [];
    for await (const chunk of incoming) chunks.push(chunk);
    const captured = { method: incoming.method, url: incoming.url, headers: incoming.headers, body: Buffer.concat(chunks).toString() };
    requests.push(captured);
    response.setHeader('Cache-Control', 'private, no-store');
    if (incoming.url === '/api/v1/redirect') {
      response.writeHead(307, { Location: '/api/v1/never-followed' });
      response.end('redirect');
      return;
    }
    if (incoming.method === 'POST' && incoming.headers.origin !== 'https://app.example.test') {
      response.writeHead(403, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ message: 'Origin rejected' }));
      return;
    }
    response.setHeader('Content-Type', 'application/json');
    response.setHeader('Set-Cookie', ['spectr_session=fixture; HttpOnly; Secure; SameSite=Lax; Path=/api/v1', 'fixture_aux=present; Path=/api/v1; HttpOnly']);
    response.end(JSON.stringify(captured));
  }));
});

after(async () => {
  await Promise.all(servers.map(server => new Promise(resolve => server.close(resolve))));
});

test('normalizes root, /api and /api/v1 configuration while preserving API path/query', async () => {
  for (const suffix of ['', '/', '/api', '/api/', '/api/v1', '/api/v1/']) {
    const proxy = await proxyFor({ SPECTR_API_URL: origin + suffix });
    const response = await call(`${proxy.url}/api/v1/suites/nested%20value?limit=2&url=https%3A%2F%2Funtrusted.test`);
    assert.equal(response.status, 200);
    assert.equal(JSON.parse(response.body).url, '/api/v1/suites/nested%20value?limit=2&url=https%3A%2F%2Funtrusted.test');
    assert.equal(JSON.parse(response.body).headers.host, new URL(origin).host);
  }
});

test('forwards POST content, cookies, Origin and workspace without following a request-selected destination', async () => {
  const proxy = await proxyFor({ SPECTR_API_URL: origin });
  const body = JSON.stringify({ name: 'Proxy fixture', enabled: false });
  const response = await call(`${proxy.url}/api/v1/auth/register?destination=https://untrusted.test`, {
    method: 'POST', body, headers: {
      'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body),
      Cookie: 'spectr_session=fixture', Origin: 'https://app.example.test', 'X-Workspace-Id': 'fixture-workspace',
      Connection: 'keep-alive, x-hop-only', 'X-Hop-Only': 'remove', 'X-Fixture': 'preserve'
    }
  });
  assert.equal(response.status, 200);
  const captured = JSON.parse(response.body);
  assert.equal(captured.method, 'POST');
  assert.equal(captured.body, body);
  assert.equal(captured.headers.cookie, 'spectr_session=fixture');
  assert.equal(captured.headers.origin, 'https://app.example.test');
  assert.equal(captured.headers['x-workspace-id'], 'fixture-workspace');
  assert.equal(captured.headers['content-type'], 'application/json');
  assert.equal(captured.headers['x-fixture'], 'preserve');
  assert.equal(captured.headers['x-hop-only'], undefined);
});

test('preserves separate Set-Cookie headers and private cache policy', async () => {
  const proxy = await proxyFor({ SPECTR_API_URL: origin });
  const response = await call(`${proxy.url}/api/v1/auth/me`);
  assert.deepEqual(response.headers['set-cookie'], [
    'spectr_session=fixture; HttpOnly; Secure; SameSite=Lax; Path=/api/v1',
    'fixture_aux=present; Path=/api/v1; HttpOnly'
  ]);
  assert.equal(response.headers['cache-control'], 'private, no-store');
});

test('does not manufacture an Origin or hide a rejected foreign Origin', async () => {
  const proxy = await proxyFor({ SPECTR_API_URL: origin });
  const missing = await call(`${proxy.url}/api/v1/workspaces`, { method: 'POST', body: '{}' });
  assert.equal(missing.status, 403);
  assert.equal(requests.at(-1).headers.origin, undefined);
  const foreign = await call(`${proxy.url}/api/v1/workspaces`, { method: 'POST', body: '{}', headers: { Origin: 'https://foreign.test' } });
  assert.equal(foreign.status, 403);
  assert.equal(requests.at(-1).headers.origin, 'https://foreign.test');
});

test('returns redirect status and Location directly without following the upstream', async () => {
  const proxy = await proxyFor({ SPECTR_API_URL: origin });
  const before = requests.length;
  const response = await call(`${proxy.url}/api/v1/redirect`);
  assert.equal(response.status, 307);
  assert.equal(response.headers.location, '/api/v1/never-followed');
  assert.equal(response.body, 'redirect');
  assert.equal(requests.length, before + 1);
});

test('supports Vercel parsed request bodies and recalculates their byte length', async () => {
  const handler = createApiProxy({ env: { NODE_ENV: 'test', SPECTR_API_URL: origin } });
  const proxy = await listen(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    req.body = JSON.parse(Buffer.concat(chunks).toString());
    await handler(req, res);
  });
  const response = await call(`${proxy.url}/api/v1/auth/login`, {
    method: 'POST', headers: { Origin: 'https://app.example.test', 'Content-Type': 'application/json' }, body: '{ "fixture": "ação" }'
  });
  assert.equal(response.status, 200);
  const forwarded = JSON.parse(response.body);
  assert.equal(forwarded.body, '{"fixture":"ação"}');
  assert.equal(Number(forwarded.headers['content-length']), Buffer.byteLength(forwarded.body));
});

test('supports legacy VITE_API_URL while dedicated SPECTR_API_URL takes priority', async () => {
  const legacy = await proxyFor({ VITE_API_URL: origin + '/api' });
  assert.equal((await call(`${legacy.url}/api/v1/auth/me`)).status, 200);
  const dedicated = await proxyFor({ SPECTR_API_URL: origin, VITE_API_URL: 'https://not-used.example.test' });
  assert.equal((await call(`${dedicated.url}/api/v1/auth/me`)).status, 200);
});

test('invalid configuration returns generic no-store JSON without exposing values or contacting upstream', async () => {
  const before = requests.length;
  const configurations = [
    {}, { SPECTR_API_URL: '/api/v1' }, { SPECTR_API_URL: 'not-a-url' },
    { SPECTR_API_URL: 'ftp://upstream.test' }, { SPECTR_API_URL: 'https://secret-user:secret-password@upstream.test' },
    { SPECTR_API_URL: origin + '/wrong-path' }, { SPECTR_API_URL: origin + '?secret=value' },
    { SPECTR_API_URL: origin, NODE_ENV: 'production' },
    { SPECTR_API_URL: 'invalid-dedicated', VITE_API_URL: origin }
  ];
  for (const env of configurations) {
    const proxy = await proxyFor(env);
    const response = await call(`${proxy.url}/api/v1/auth/me`);
    assert.equal(response.status, 502);
    assert.match(response.headers['content-type'], /^application\/json/);
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.deepEqual(Object.keys(JSON.parse(response.body)), ['message']);
    assert.doesNotMatch(response.body, /secret|upstream|invalid-dedicated|wrong-path/);
  }
  assert.equal(requests.length, before);
});

test('network failures return generic JSON and a bounded upstream timeout', async () => {
  const unreachable = await listen((req, res) => res.end());
  await new Promise(resolve => unreachable.server.close(resolve));
  const failed = await proxyFor({ SPECTR_API_URL: unreachable.url });
  const response = await call(`${failed.url}/api/v1/auth/me`);
  assert.equal(response.status, 502);
  assert.doesNotMatch(response.body, /ECONNREFUSED|127\.0\.0\.1|stack/);
  const stalled = await listen(() => {});
  const timed = await proxyFor({ SPECTR_API_URL: stalled.url }, { timeoutMs: 30 });
  assert.equal((await call(`${timed.url}/api/v1/auth/me`)).status, 502);
});

test('rejects oversized request bodies before contacting the upstream', async () => {
  const proxy = await proxyFor({ SPECTR_API_URL: origin });
  const before = requests.length;
  const response = await call(`${proxy.url}/api/v1/auth/register`, {
    method: 'POST', headers: { Origin: 'https://app.example.test' }, body: 'x'.repeat(1024 * 1024 + 1)
  });
  assert.equal(response.status, 413);
  assert.equal(requests.length, before);
});

test('Vercel checks filesystem functions before the SPA and excludes API paths from its fallback', async () => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.deepEqual(config.routes[0], { handle: 'filesystem' });
  const fallback = config.routes.find(route => route.dest === '/index.html');
  const pattern = new RegExp(`^(?:${fallback.src})$`);
  for (const path of ['/api', '/api/v1/auth/me', '/api/not-found']) assert.equal(pattern.test(path), false);
  for (const path of ['/', '/collections/fixture', '/apiary']) assert.equal(pattern.test(path), true);
});
