import assert from 'node:assert/strict';
import dns from 'node:dns/promises';
import { syncBuiltinESMExports } from 'node:module';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { isPublicAddress, resolveTarget, safeFetch } from '../src/security/safeFetch.js';

// Network tests run in an isolated process: stream cancellation regressions must fail
// the test instead of terminating the entire test runner with an uncaught adapter error.
function localTransportCheck(code: string) {
  const source = `
    import assert from 'node:assert/strict';
    import { createServer } from 'node:http';
    import { gzipSync } from 'node:zlib';
    import { safeFetch } from './src/security/safeFetch.ts';
    const servers = [];
    async function serve(handler) {
      const server = createServer(handler);
      servers.push(server);
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
      return 'http://127.0.0.1:' + server.address().port;
    }
    try { ${code} }
    finally {
      for (const server of servers) {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
      }
    }
  `;
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', source], {
    cwd: process.cwd(), encoding: 'utf8', timeout: 10000,
    env: { ...process.env, NODE_ENV: 'test', TARGET_ALLOWED_HOSTS: '' }
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `Local HTTP regression subprocess failed: ${result.stderr}`);
}

async function mockedLookup<T>(lookup: typeof dns.lookup, check: () => Promise<T>): Promise<T> {
  const originalLookup = dns.lookup;
  dns.lookup = lookup;
  syncBuiltinESMExports();
  try { return await check(); }
  finally { dns.lookup = originalLookup; syncBuiltinESMExports(); }
}

test('public address classification rejects private, reserved and mapped address families', () => {
  for (const address of [
    '0.0.0.0', '0.1.2.3', '10.0.0.1', '100.64.0.1', '100.127.255.255',
    '127.0.0.1', '127.255.255.255', '169.254.169.254', '172.16.0.1', '172.31.255.255',
    '192.168.1.1', '192.0.0.1', '192.0.2.10', '192.88.99.1', '198.18.0.1', '198.19.255.255',
    '198.51.100.2', '203.0.113.2', '224.0.0.1', '240.0.0.1', '255.255.255.255',
    '::', '::1', 'fe80::1', 'fc00::1', 'fd12::1', 'ff02::1',
    '::ffff:127.0.0.1', '::ffff:8.8.8.8', '2002:0808:0808::1', '2001:db8::1', '2001::1', '3fff::1', '3fff:fff:ffff::1', 'not-an-ip'
  ]) assert.equal(isPublicAddress(address), false, address);
  for (const address of ['1.1.1.1', '8.8.8.8', '100.63.255.255', '100.128.0.1', '172.15.255.255', '172.32.0.1', '192.0.78.24', '198.20.0.1', '2001:4860:4860::8888', '2606:4700:4700::1111', '2804:14d:5c01::1']) {
    assert.equal(isPublicAddress(address), true, address);
  }
});

test('normalized numeric IPv4, metadata, localhost and unsupported URLs cannot bypass destination checks', async () => {
  for (const value of [
    'http://2130706433/health', 'http://0x7f000001/health', 'http://0177.0.0.1/health', 'http://127.1/health',
    'http://169.254.169.254/latest/meta-data', 'http://[::ffff:127.0.0.1]/', 'http://[::1]/health',
    'http://localhost/health', 'http://localhost./health', 'http://service.local/health',
    'file:///tmp/file', 'ftp://127.0.0.1/file', 'http://user:unused@example.test/'
  ]) await assert.rejects(resolveTarget(new URL(value), { allowPrivateTargets: false }));
  const target = await resolveTarget(new URL('https://8.8.8.8/'), { allowPrivateTargets: false });
  assert.equal(target.address, '8.8.8.8');
});

test('DNS answers containing a private or metadata address are denied before connecting', async () => {
  let calls = 0;
  await mockedLookup((async () => {
    calls++;
    return [{ address: '8.8.8.8', family: 4 }, { address: '169.254.169.254', family: 4 }];
  }) as typeof dns.lookup, async () => {
    await assert.rejects(resolveTarget(new URL('https://private.fixture.test/'), { allowPrivateTargets: false }), /privada|metadados/);
  });
  assert.equal(calls, 1);
});

test('the local simulator exception is restricted to its configured port and known paths', async () => {
  const previousPort = process.env.PORT;
  process.env.PORT = '3349';
  try {
    const allowed = await resolveTarget(new URL('http://127.0.0.1:3349/api/v1/chaos/echo?check=1'), { allowPrivateTargets: false });
    assert.equal(allowed.address, '127.0.0.1');
    for (const value of [
      'http://127.0.0.1:3350/api/v1/chaos/echo', 'https://127.0.0.1:3349/api/v1/chaos/echo',
      'http://127.0.0.1:3349/api/v1/suites', 'http://127.0.0.1:3349/api/v1/chaos/echo/../health',
      'http://127.0.0.1:3349/api/v1/chaos/%65cho'
    ]) await assert.rejects(resolveTarget(new URL(value), { allowPrivateTargets: false }));
  } finally {
    if (previousPort === undefined) delete process.env.PORT; else process.env.PORT = previousPort;
  }
});

test('AbortSignal terminates the wait for a stalled DNS lookup', async () => {
  await mockedLookup((() => new Promise(() => {})) as unknown as typeof dns.lookup, async () => {
    const controller = new AbortController();
    const start = Date.now();
    const timer = setTimeout(() => controller.abort(), 30);
    try { await assert.rejects(safeFetch('http://dns.fixture.test/', { signal: controller.signal }, { allowPrivateTargets: false }), /abort/i); }
    finally { clearTimeout(timer); }
    assert.ok(Date.now() - start < 1000);
  });
});

test('cross-origin redirects strip custom credentials and block retained bodies while same-origin 307 preserves them', () => {
  localTransportCheck(`
    let targetRequests = 0;
    const echo = async (request, response) => {
      let body = '';
      for await (const part of request) body += part;
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ authorization: request.headers.authorization, cookie: request.headers.cookie, apiKey: request.headers['x-api-key'], token: request.headers['x-custom-token'], keep: request.headers['x-keep'], accept: request.headers.accept, contentType: request.headers['content-type'], method: request.method, body }));
    };
    const target = await serve((request, response) => { targetRequests++; void echo(request, response); });
    const origin = await serve((request, response) => {
      if (request.url === '/same') { response.writeHead(307, { location: '/echo' }); response.end(); }
      else if (request.url === '/cross') { response.writeHead(307, { location: target + '/echo' }); response.end(); }
      else if (request.url === '/rewrite') { response.writeHead(303, { location: target + '/echo' }); response.end(); }
      else void echo(request, response);
    });
    const headers = { Authorization: 'Bearer fixture', Cookie: 'fixture=only-local', 'X-Api-Key': 'fixture-key', 'X-Custom-Token': 'fixture-token', 'X-Keep': 'present', Accept: 'application/json', 'Content-Type': 'application/json' };
    const init = { method: 'POST', headers, body: '{"ok":true}' };
    const same = await (await safeFetch(origin + '/same', init, { allowPrivateTargets: true })).json();
    assert.ok(!!same.authorization && !!same.cookie && !!same.apiKey && !!same.token);
    assert.equal(same.method, 'POST'); assert.equal(same.body, init.body);
    await assert.rejects(safeFetch(origin + '/cross', init, { allowPrivateTargets: true }), /body.*outra origem/);
    assert.equal(targetRequests, 0);
    const cross = await (await safeFetch(origin + '/cross', { headers }, { allowPrivateTargets: true })).json();
    assert.equal(cross.authorization, undefined); assert.equal(cross.cookie, undefined); assert.equal(cross.apiKey, undefined); assert.equal(cross.token, undefined); assert.equal(cross.keep, undefined);
    assert.equal(cross.accept, 'application/json'); assert.equal(cross.method, 'GET'); assert.equal(cross.body, '');
    const rewrite = await (await safeFetch(origin + '/rewrite', init, { allowPrivateTargets: true })).json();
    assert.equal(rewrite.method, 'GET'); assert.equal(rewrite.body, ''); assert.equal(rewrite.contentType, undefined);
    assert.equal(rewrite.apiKey, undefined); assert.equal(rewrite.token, undefined);
  `);
});

test('redirects recheck private destinations even when the initial local simulator is allowed', () => {
  localTransportCheck(`
    let reached = false;
    const target = await serve((_request, response) => { reached = true; response.end('must not be reached'); });
    const origin = await serve((_request, response) => { response.writeHead(302, { location: target + '/private' }); response.end(); });
    process.env.PORT = new URL(origin).port;
    await assert.rejects(safeFetch(origin + '/api/v1/chaos/echo', {}, { allowPrivateTargets: false }), /privada|reservada|permitid/);
    assert.equal(reached, false);
  `);
});

test('following a redirect with an open response body does not crash the process', () => {
  localTransportCheck(`
    const origin = await serve((request, response) => {
      if (request.url === '/redirect') { response.writeHead(302, { location: '/ok' }); response.write('redirect body remains open'); }
      else response.end('ok');
    });
    const response = await safeFetch(origin + '/redirect', { signal: AbortSignal.timeout(2000) }, { allowPrivateTargets: true });
    assert.equal(await response.text(), 'ok');
  `);
});

test('response size is limited to 2 MiB after decompression', () => {
  localTransportCheck(`
    const oversized = Buffer.alloc(2 * 1024 * 1024 + 32, 'x');
    const origin = await serve((request, response) => {
      if (request.url === '/compressed') { response.setHeader('Content-Encoding', 'gzip'); response.end(gzipSync(oversized)); }
      else response.end(oversized);
    });
    for (const path of ['/raw', '/compressed']) {
      const response = await safeFetch(origin + path, { signal: AbortSignal.timeout(2000) }, { allowPrivateTargets: true });
      await assert.rejects(response.text(), /2 MiB|limite/);
    }
  `);
});

test('AbortSignal stops an unfinished response body and redirect loops are bounded', () => {
  localTransportCheck(`
    const origin = await serve((request, response) => {
      if (request.url === '/body') { response.writeHead(200); response.write('partial'); }
      else { response.writeHead(302, { location: '/loop' }); response.end(); }
    });
    const controller = new AbortController();
    const response = await safeFetch(origin + '/body', { signal: controller.signal }, { allowPrivateTargets: true });
    const timer = setTimeout(() => controller.abort(), 30);
    try { await assert.rejects(response.text(), /abort/i); } finally { clearTimeout(timer); }
    await assert.rejects(safeFetch(origin + '/loop', { signal: AbortSignal.timeout(2000) }, { allowPrivateTargets: true }), /redirecionamentos/);
  `);
});
