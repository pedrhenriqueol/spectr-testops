import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

// Every test run gets a new database; neither the development database nor seed is touched.
const directory = mkdtempSync(join(tmpdir(), 'spectr-test-'));
// Prisma's SQLite schema engine expects an existing file in this environment.
writeFileSync(join(directory, 'test.db'), '');
const testEnv = { ...process.env, NODE_ENV: 'test', DATABASE_URL: `file:${join(directory, 'test.db')}` };
try {
  const schema = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'db', 'push', '--skip-generate'], {
    stdio: 'inherit', env: testEnv
  });
  if (schema.error) throw schema.error;
  if (schema.status !== 0) process.exitCode = schema.status ?? 1;
  else {
    const testFiles = readdirSync('test').filter((name) => name.endsWith('.test.ts')).sort().map((name) => `test/${name}`);
    if (testFiles.length === 0) throw new Error('Nenhum teste de regressão encontrado.');
    const tests = spawnSync(process.execPath, ['--import', 'tsx', '--test', '--test-concurrency=1', ...testFiles], {
      stdio: 'inherit', env: testEnv
    });
    if (tests.error) throw tests.error;
    process.exitCode = tests.status ?? 1;
  }
} finally {
  rmSync(directory, { recursive: true, force: true });
}
