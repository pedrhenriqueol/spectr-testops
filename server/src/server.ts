import { buildApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './shared/prisma.js';

const app = buildApp();
let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  try {
    await app.close();
    await prisma.$disconnect();
  } catch (error) {
    app.log.error(error);
    process.exitCode = 1;
  }
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

try {
  await prisma.$connect();
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  console.log(`Spectr TestOps Engine ativo na porta ${env.PORT}`);
} catch (error) {
  app.log.error(error);
  await shutdown();
  process.exitCode = 1;
}
