import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

// Versioned parameters allow future work-factor upgrades without invalidating accounts.
const COST = { N: 32768, r: 8, p: 3 };
function derive(password: string, salt: string, cost = COST): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { ...cost, maxmem: 64 * 1024 * 1024 }, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  return `scrypt:${COST.N}:${COST.r}:${COST.p}:${salt}:${(await derive(password, salt)).toString('hex')}`;
}

// Unknown accounts still run the same password KDF as an incorrect password.
export const DUMMY_PASSWORD_HASH = `scrypt:${COST.N}:${COST.r}:${COST.p}:${'0'.repeat(32)}:${'0'.repeat(128)}`;

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const parts = encoded.split(':');
  const legacy = parts.length === 3;
  const [algorithm, salt, expected] = legacy ? parts : [parts[0], parts[4], parts[5]];
  const cost = legacy ? { N: 16384, r: 8, p: 1 } : COST;
  // Do not accept arbitrary KDF parameters from a malformed database record.
  if (!legacy && (parts.length !== 6 || parts[1] !== String(COST.N) || parts[2] !== String(COST.r) || parts[3] !== String(COST.p))) return false;
  if (algorithm !== 'scrypt' || !/^[a-f\d]{32}$/i.test(salt || '') || !/^[a-f\d]{128}$/i.test(expected || '')) return false;
  const actual = await derive(password, salt, cost);
  return timingSafeEqual(actual, Buffer.from(expected, 'hex'));
}
