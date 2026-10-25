import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes, randomUUID, scrypt } from 'node:crypto';
import { test } from 'node:test';
import { prisma } from '../src/shared/prisma.js';
import { verifyPassword } from '../src/auth/passwords.js';

function runProcess(input: object): Record<string, unknown> {
  const child = spawnSync(process.execPath, ['--import', 'tsx', 'test/fixtures/persistence-process.ts'], {
    env: { ...process.env, NODE_ENV: 'test' }, input: JSON.stringify(input), encoding: 'utf8', timeout: 20_000
  });
  assert.equal(child.status, 0, 'Independent API process must finish successfully.');
  assert.equal(child.stderr, '', 'Independent API process must not log errors.');
  return JSON.parse(child.stdout);
}

test('accounts, credentials, sessions and collections survive an API process restart', async () => {
  const email = `${randomUUID()}@example.test`;
  const password = randomBytes(24).toString('base64url');
  let stored: Record<string, unknown> | undefined;
  try {
    stored = runProcess({ action: 'register', email, password });
    const resumed = runProcess({ action: 'resume', email, password, ...stored });
    assert.equal(resumed.previousSessionStatus, 200);
    assert.equal(resumed.sameUser, true);
    assert.equal(resumed.sameWorkspace, true);
    assert.equal(resumed.loginStatus, 200);
    assert.equal(resumed.loginSameUser, true);
    assert.equal(resumed.invalidLoginStatus, 401);
    assert.equal(resumed.suitesStatus, 200);
    assert.equal(resumed.collectionSurvived, true);
  } finally {
    if (typeof stored?.workspaceId === 'string') await prisma.workspace.deleteMany({ where: { id: stored.workspaceId } });
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  }
});

test('legacy scrypt password records still authenticate without rewriting credentials', async () => {
  const password = `Legacy-${randomUUID()}`;
  const salt = randomBytes(16).toString('hex');
  const digest = await new Promise<Buffer>((resolve, reject) => scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (error, key) => error ? reject(error) : resolve(key)));
  const encoded = `scrypt:${salt}:${digest.toString('hex')}`;
  assert.equal(await verifyPassword(password, encoded), true);
  assert.equal(await verifyPassword(`${password}-incorrect`, encoded), false);
});
