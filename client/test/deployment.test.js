import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { getTransformedRoutes } from '@vercel/routing-utils';

const clientRoot = new URL('../', import.meta.url);
const repositoryRoot = new URL('../../', import.meta.url);
const configs = await Promise.all([
  ['repository root', new URL('vercel.json', repositoryRoot)],
  ['client root', new URL('vercel.json', clientRoot)]
].map(async ([name, path]) => ({ name, config: JSON.parse(await readFile(path, 'utf8')) })));
const apiOrigin = 'https://spectr-testops-server.onrender.com';

function transformed(config) {
  const result = getTransformedRoutes(config);
  assert.equal(result.error, null, JSON.stringify(result.error));
  return result.routes;
}

// Use Vercel's own compiled patterns and capture substitutions. This verifies
// deployment rules; it does not pretend to run Vercel's edge proxy locally.
function routeFor(routes, pathname) {
  return routes.find(route => route.src && new RegExp(route.src).test(pathname));
}

function destinationFor(route, pathname) {
  const captured = new RegExp(route.src).exec(pathname);
  assert.ok(captured);
  return route.dest.replace(/\$(\d+)/g, (_, index) => captured[Number(index)] || '');
}

for (const { name, config } of configs) {
  test(`${name}: official Vercel routing compiler accepts the deployment`, () => {
    assert.ok(transformed(config).length > 0);
  });

  test(`${name}: session and workspace operations route directly to the real Render API`, () => {
    const routes = transformed(config);
    const paths = [
      '/api/v1/auth/me', '/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/logout',
      '/api/v1/workspaces', '/api/v1/suites', '/api/v1/suites/suite-id',
      '/api/v1/suites/suite-id/cases', '/api/v1/suites/suite-id/cases/case-id',
      '/api/v1/cases/case-id/run', '/api/v1/suites/suite-id/run',
      '/api/v1/runs', '/api/v1/runs/run-id', '/api/v1/metrics/overview', '/api/v1/chaos/echo'
    ];
    for (const pathname of paths) {
      const rule = routeFor(routes, pathname);
      assert.ok(rule, `${pathname} must not produce the former Vercel route 404`);
      assert.equal(destinationFor(rule, pathname), `${apiOrigin}${pathname}`);
      assert.equal(rule.methods, undefined, 'GET, POST, PATCH and DELETE share the API rewrite');
    }
  });

  test(`${name}: encoded paths and query-bearing API URLs cannot change the upstream`, () => {
    const routes = transformed(config);
    for (const input of [
      '/api/v1/runs?limit=20',
      '/api/v1/suites/nested%20name/cases/value%2Fencoded?tag=a&tag=b',
      '/api/v1/chaos/echo?destination=https%3A%2F%2Funtrusted.invalid&name=a%26b'
    ]) {
      const incoming = new URL(input, 'https://spectr-testops.vercel.app');
      const rule = routeFor(routes, incoming.pathname);
      assert.ok(rule);
      const upstream = new URL(destinationFor(rule, incoming.pathname));
      assert.equal(upstream.origin, apiOrigin);
      assert.equal(upstream.pathname, incoming.pathname, 'Encoded path must not be decoded or prefixed twice');
      assert.equal(upstream.search, '', 'Destination must not replace incoming query parameters');
      assert.equal(rule.has, undefined, 'API matching must not depend on query parameters');
      assert.equal(rule.missing, undefined);
    }
  });

  test(`${name}: missing API routes never fall back to the SPA and static files retain precedence`, () => {
    const routes = transformed(config);
    assert.equal(routes[0].handle, 'filesystem', 'Existing JS/CSS assets must resolve before SPA fallback');
    for (const pathname of ['/api', '/api/unknown', '/api/v2/auth/me']) {
      assert.equal(routeFor(routes, pathname), undefined, `${pathname} must not return index.html`);
    }
    assert.equal(destinationFor(routeFor(routes, '/api/v1/unknown'), '/api/v1/unknown'), `${apiOrigin}/api/v1/unknown`);
    for (const pathname of ['/', '/collections/deep-link', '/apiary']) {
      assert.equal(routeFor(routes, pathname)?.dest, '/index.html');
    }
  });
}

test('both supported project roots share routes and build the same client output', async () => {
  const root = configs[0].config;
  const client = configs[1].config;
  assert.deepEqual(root.rewrites, client.rewrites);
  assert.equal(root.framework, 'vite');
  assert.equal(client.framework, 'vite');
  assert.equal(root.installCommand, 'npm --prefix client ci');
  assert.equal(root.buildCommand, 'npm --prefix client run build');
  assert.equal(client.installCommand, 'npm ci');
  assert.equal(client.buildCommand, 'npm run build');
  assert.equal(new URL(`${root.outputDirectory}/`, repositoryRoot).href, new URL(`${client.outputDirectory}/`, clientRoot).href);
  const manifest = JSON.parse(await readFile(new URL('package.json', clientRoot), 'utf8'));
  assert.match(manifest.scripts.build, /vite build/);
  assert.equal(JSON.parse(await readFile(new URL('package-lock.json', clientRoot), 'utf8')).name, manifest.name);
});
