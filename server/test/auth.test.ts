import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/shared/prisma.js';
import { hashSessionToken } from '../src/auth/sessions.js';
import { createTestSession } from './auth-helper.js';
import { env } from '../src/config/env.js';

let app: FastifyInstance;
const users = new Set<string>();
const workspaces = new Set<string>();
before(async () => { app = buildApp(); await app.ready(); });
after(async () => {
  await prisma.workspace.deleteMany({ where: { id: { in: [...workspaces] } } });
  await prisma.user.deleteMany({ where: { id: { in: [...users] } } });
  await app.close();
  await prisma.$disconnect();
});

async function fixture() {
  const session = await createTestSession(app);
  users.add(session.user.id);
  workspaces.add(session.workspaceId);
  return session;
}
function cookieOf(response: { headers: Record<string, string | string[] | number | undefined> }): string {
  const value = response.headers['set-cookie'];
  const cookie = (Array.isArray(value) ? value[0] : String(value || '')).split(';')[0];
  if (!cookie.startsWith('spectr_session=')) throw new Error('Expected session cookie not returned.');
  return cookie;
}

test('registration hashes passwords, sets a private cookie and does not claim legacy data', async () => {
  const legacy = await prisma.workspace.create({ data: { name: 'Legacy', slug: randomUUID(), apiKey: randomUUID() } });
  workspaces.add(legacy.id);
  const password = `Local-test-${randomUUID()}`;
  const response = await app.inject({ method: 'POST', url: '/api/v1/auth/register', remoteAddress: '198.51.100.101', payload: { name: 'First user', email: `${randomUUID()}@example.test`, password } });
  assert.equal(response.statusCode, 201);
  const result = response.json();
  users.add(result.user.id);
  workspaces.add(result.currentWorkspaceId);
  assert.deepEqual(Object.keys(result.user).sort(), ['email', 'id', 'name']);
  assert.equal(result.workspaces.length, 1);
  assert.notEqual(result.currentWorkspaceId, legacy.id);
  assert.equal(result.workspaces[0].role, 'OWNER');
  assert.equal(result.workspaces[0].apiKey, undefined);
  const saved = await prisma.user.findUniqueOrThrow({ where: { id: result.user.id } });
  assert.ok(saved.passwordHash.startsWith('scrypt:'));
  assert.ok(saved.passwordHash !== password);
  const rawCookie = String(response.headers['set-cookie']);
  assert.ok(rawCookie.includes('HttpOnly') && rawCookie.includes('SameSite=Lax') && rawCookie.includes('Path=/api/v1'));
  const token = cookieOf(response).split('=')[1];
  const persisted = await prisma.session.findUnique({ where: { tokenHash: hashSessionToken(token) } });
  assert.ok(persisted);
  assert.ok(persisted.tokenHash !== token);
  const me = await app.inject({ method: 'GET', url: '/api/v1/auth/me', headers: { cookie: cookieOf(response) } });
  assert.equal(me.statusCode, 200);
  assert.equal(me.json().workspaces.some((workspace: { id: string }) => workspace.id === legacy.id), false);
});

test('login normalizes email and rejects unknown and incorrect credentials consistently', async () => {
  const email = `${randomUUID()}@example.test`;
  const password = `Local-test-${randomUUID()}`;
  const registered = await app.inject({ method: 'POST', url: '/api/v1/auth/register', remoteAddress: '198.51.100.102', payload: { name: 'Login user', email, password } });
  const registration = registered.json();
  users.add(registration.user.id); workspaces.add(registration.currentWorkspaceId);
  const login = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: ` ${email.toUpperCase()} `, password } });
  assert.equal(login.statusCode, 200);
  assert.equal(login.json().user.email, email);
  assert.ok(cookieOf(login) !== cookieOf(registered));
  const incorrect = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password: 'incorrect-password' } });
  const absent = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: `${randomUUID()}@example.test`, password: 'incorrect-password' } });
  assert.equal(incorrect.statusCode, 401); assert.equal(absent.statusCode, 401);
  assert.deepEqual(incorrect.json(), absent.json());
});

test('session expiry and logout revoke access', async () => {
  const expired = await fixture();
  await prisma.session.updateMany({ where: { userId: expired.user.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
  assert.equal((await app.inject({ method: 'GET', url: '/api/v1/auth/me', headers: expired.headers })).statusCode, 401);
  const session = await fixture();
  assert.equal((await app.inject({ method: 'POST', url: '/api/v1/auth/logout', headers: session.headers })).statusCode, 204);
  assert.equal(await prisma.session.count({ where: { userId: session.user.id } }), 0);
  assert.equal((await app.inject({ method: 'GET', url: '/api/v1/auth/me', headers: session.headers })).statusCode, 401);
  assert.equal((await app.inject({ method: 'POST', url: '/api/v1/auth/logout', headers: session.headers })).statusCode, 204);
});

test('unsafe authentication and workspace operations reject foreign origins', async () => {
  const session = await fixture();
  for (const url of ['/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/logout', '/api/v1/workspaces']) {
    const response = await app.inject({ method: 'POST', url, headers: { ...session.headers, origin: 'https://untrusted.example' }, payload: {} });
    assert.equal(response.statusCode, 403, url);
  }
  assert.equal((await app.inject({ method: 'GET', url: '/api/v1/auth/me', headers: session.headers })).statusCode, 200);
});

test('workspace creation is owned, private and excludes other users', async () => {
  const owner = await fixture(); const other = await fixture();
  const created = await app.inject({ method: 'POST', url: '/api/v1/workspaces', headers: owner.headers, payload: { name: 'Private project' } });
  assert.equal(created.statusCode, 201);
  const workspace = created.json().workspace;
  workspaces.add(workspace.id);
  assert.equal(workspace.role, 'OWNER'); assert.equal(workspace.apiKey, undefined);
  const ownList = await app.inject({ method: 'GET', url: '/api/v1/workspaces', headers: owner.headers });
  const otherList = await app.inject({ method: 'GET', url: '/api/v1/workspaces', headers: other.headers });
  assert.equal(ownList.json().workspaces.length, 2);
  assert.equal(otherList.json().workspaces.some((item: { id: string }) => item.id === workspace.id), false);
  const denied = await app.inject({ method: 'GET', url: '/api/v1/suites', headers: { ...other.headers, 'x-workspace-id': workspace.id } });
  assert.equal(denied.statusCode, 403);
});

test('protected application routes require authentication', async () => {
  for (const url of ['/api/v1/suites', '/api/v1/runs', '/api/v1/metrics/overview', '/api/v1/workspaces', '/api/v1/auth/me']) {
    assert.equal((await app.inject({ method: 'GET', url })).statusCode, 401, url);
  }
  assert.equal((await app.inject({ method: 'GET', url: '/health' })).statusCode, 200);
  assert.equal((await app.inject({ method: 'GET', url: '/api/v1/chaos/echo' })).statusCode, 200);
});

test('registration validates password length and keeps credentials out of responses', async () => {
  const response = await app.inject({ method: 'POST', url: '/api/v1/auth/register', remoteAddress: '198.51.100.103', payload: { name: 'Test user', email: `${randomUUID()}@example.test`, password: 'short' } });
  assert.equal(response.statusCode, 400);
  assert.equal(response.json().password, undefined);
  assert.equal(response.json().passwordHash, undefined);
});

test('login rate limits repeated attempts per IP', async () => {
  let response;
  for (let index = 0; index < 11; index++) response = await app.inject({ method: 'POST', url: '/api/v1/auth/login', remoteAddress: '198.51.100.199', payload: { email: 'nobody@example.test', password: 'not-a-real-password' } });
  assert.equal(response?.statusCode, 429);
});

test('cross-site cookie mode requires HTTPS attributes and exact Origin on unsafe requests', async () => {
  const previousSameSite = env.SESSION_SAME_SITE;
  const previousSecure = env.SESSION_SECURE;
  env.SESSION_SAME_SITE = 'none';
  env.SESSION_SECURE = true;
  try {
    const payload = { name: 'Cross-site user', email: `${randomUUID()}@example.test`, password: `Cross-site-${randomUUID()}` };
    const missing = await app.inject({ method: 'POST', url: '/api/v1/auth/register', remoteAddress: '198.51.100.201', payload });
    const foreign = await app.inject({ method: 'POST', url: '/api/v1/auth/register', remoteAddress: '198.51.100.202', headers: { origin: 'https://untrusted.example' }, payload });
    assert.equal(missing.statusCode, 403);
    assert.equal(foreign.statusCode, 403);
    const registered = await app.inject({ method: 'POST', url: '/api/v1/auth/register', remoteAddress: '198.51.100.203', headers: { origin: new URL(env.CLIENT_URL).origin }, payload });
    assert.equal(registered.statusCode, 201);
    users.add(registered.json().user.id); workspaces.add(registered.json().currentWorkspaceId);
    const attributes = String(registered.headers['set-cookie']);
    assert.ok(attributes.includes('SameSite=None') && attributes.includes('; Secure'));
    const denied = await app.inject({ method: 'POST', url: '/api/v1/workspaces', headers: { cookie: cookieOf(registered) }, payload: { name: 'No origin' } });
    assert.equal(denied.statusCode, 403);
  } finally {
    env.SESSION_SAME_SITE = previousSameSite;
    env.SESSION_SECURE = previousSecure;
  }
});
