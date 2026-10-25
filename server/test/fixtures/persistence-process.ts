import { readFileSync } from 'node:fs';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/shared/prisma.js';

type FixtureInput = {
  action: 'register' | 'resume';
  email: string;
  password: string;
  cookie?: string;
  userId?: string;
  workspaceId?: string;
  suiteId?: string;
};

const input = JSON.parse(readFileSync(0, 'utf8')) as FixtureInput;
const app = buildApp();
const origin = process.env.CLIENT_URL || 'http://localhost:5173';

function cookieOf(response: { headers: Record<string, unknown> }): string {
  const value = response.headers['set-cookie'];
  const cookie = (Array.isArray(value) ? String(value[0]) : String(value || '')).split(';')[0];
  if (!cookie.startsWith('spectr_session=')) throw new Error('Missing fixture cookie.');
  return cookie;
}

try {
  if (input.action === 'register') {
    const registered = await app.inject({ method: 'POST', url: '/api/v1/auth/register', headers: { origin }, payload: { name: 'Persistence fixture', email: input.email, password: input.password } });
    if (registered.statusCode !== 201) throw new Error('Fixture registration failed.');
    const session = registered.json();
    const cookie = cookieOf(registered);
    const suite = await app.inject({ method: 'POST', url: '/api/v1/suites', headers: { origin, cookie, 'x-workspace-id': session.currentWorkspaceId }, payload: { name: 'Restart fixture collection', baseUrl: 'https://example.invalid' } });
    if (suite.statusCode !== 201) throw new Error('Fixture collection failed.');
    // Only the parent test consumes this JSON; credentials never enter logs/argv.
    process.stdout.write(JSON.stringify({ userId: session.user.id, workspaceId: session.currentWorkspaceId, cookie, suiteId: suite.json().suite.id }));
  } else {
    const previousSession = await app.inject({ method: 'GET', url: '/api/v1/auth/me', headers: { cookie: input.cookie || '' } });
    const login = await app.inject({ method: 'POST', url: '/api/v1/auth/login', headers: { origin }, payload: { email: input.email, password: input.password } });
    const invalidLogin = await app.inject({ method: 'POST', url: '/api/v1/auth/login', headers: { origin }, payload: { email: input.email, password: `${input.password}-incorrect` } });
    const suites = await app.inject({ method: 'GET', url: '/api/v1/suites', headers: { cookie: cookieOf(login), 'x-workspace-id': input.workspaceId || '' } });
    process.stdout.write(JSON.stringify({
      previousSessionStatus: previousSession.statusCode,
      sameUser: previousSession.statusCode === 200 && previousSession.json().user.id === input.userId,
      sameWorkspace: previousSession.statusCode === 200 && previousSession.json().currentWorkspaceId === input.workspaceId,
      loginStatus: login.statusCode,
      loginSameUser: login.statusCode === 200 && login.json().user.id === input.userId,
      invalidLoginStatus: invalidLogin.statusCode,
      suitesStatus: suites.statusCode,
      collectionSurvived: suites.statusCode === 200 && suites.json().suites.some((suite: { id: string }) => suite.id === input.suiteId)
    }));
  }
} catch {
  // Do not serialize input or HTTP responses: they contain fixture secrets.
  console.error('Persistence process fixture failed.');
  process.exitCode = 1;
} finally {
  await app.close();
  await prisma.$disconnect();
}
