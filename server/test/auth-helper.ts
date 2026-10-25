import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';

let nextAddress = 1;
export async function createTestSession(app: FastifyInstance) {
  const identity = randomUUID();
  const response = await app.inject({
    method: 'POST', url: '/api/v1/auth/register', remoteAddress: `198.51.100.${nextAddress++ % 250 + 1}`,
    payload: { name: 'Test account', email: `${identity}@example.test`, password: `Test-${randomUUID()}`, workspaceName: 'Isolated test workspace' }
  });
  if (response.statusCode !== 201) throw new Error(`Unable to create authenticated test fixture (HTTP ${response.statusCode}).`);
  const result = response.json<{ user: { id: string; name: string; email: string }; currentWorkspaceId: string }>();
  const setCookie = response.headers['set-cookie'];
  const cookie = (Array.isArray(setCookie) ? setCookie[0] : setCookie)?.split(';')[0];
  if (!cookie) throw new Error('Session cookie missing from authenticated test fixture.');
  return { user: result.user, workspaceId: result.currentWorkspaceId, cookie, headers: { cookie, 'x-workspace-id': result.currentWorkspaceId } };
}
