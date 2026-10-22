import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Stable IDs make repeated setup safe. Never delete or overwrite user collections/runs.
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'spectr-local-demo' },
    update: {},
    create: { name: 'Spectr Local Demo', slug: 'spectr-local-demo', apiKey: `spk_demo_${randomUUID()}` }
  });
  const port = Number(process.env.PORT || 3335);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT inválida para seed local.');
  const baseUrl = `http://localhost:${port}/api/v1`;

  await prisma.testSuite.upsert({
    where: { id: 'cb28a4f3-6ec9-4adf-8509-1584b90e8e01' },
    update: {},
    create: {
      id: 'cb28a4f3-6ec9-4adf-8509-1584b90e8e01',
      workspaceId: workspace.id,
      name: 'Local API — Contract & Echo',
      description: 'Coleção local determinística para validar o runner, payloads e contratos sem credenciais ou serviços externos.',
      baseUrl,
      headers: JSON.stringify({ Accept: 'application/json' }),
      cases: { create: [
        {
          name: 'Gateway Echo Liveness', method: 'GET', path: '/chaos/echo',
          expectedStatus: 200, maxLatencyMs: 1500, orderIndex: 0,
          expectedSchema: JSON.stringify({ type: 'object', required: ['method', 'url', 'timestamp'] })
        },
        {
          name: 'JSON Payload Contract', method: 'POST', path: '/chaos/echo',
          body: JSON.stringify({ transactionId: 'demo-local', amount: 1250, currency: 'BRL' }),
          expectedStatus: 200, maxLatencyMs: 1500, orderIndex: 1,
          expectedSchema: JSON.stringify({
            type: 'object', required: ['body'], properties: {
              body: { type: 'object', required: ['transactionId', 'amount'], properties: { amount: { type: 'number' } } }
            }
          })
        }
      ] }
    }
  });
  await prisma.testSuite.upsert({
    where: { id: 'cb28a4f3-6ec9-4adf-8509-1584b90e8e02' },
    update: {},
    create: {
      id: 'cb28a4f3-6ec9-4adf-8509-1584b90e8e02',
      workspaceId: workspace.id,
      name: 'Local Chaos — Resilience Lab',
      description: 'Atraso e erro esperados são verificáveis localmente. O caso intermitente é opcional e desativado por padrão.',
      baseUrl,
      cases: { create: [
        {
          name: 'Injected Latency (80ms)', method: 'GET', path: '/chaos/simulate-delay?delay=80',
          expectedStatus: 200, maxLatencyMs: 1500, orderIndex: 0,
          expectedSchema: JSON.stringify({ type: 'object', required: ['simulated', 'delayInjectedMs'] })
        },
        {
          name: 'Expected 503 Service Unavailable', method: 'GET', path: '/chaos/simulate-error?code=503',
          expectedStatus: 503, maxLatencyMs: 1500, orderIndex: 1,
          expectedSchema: JSON.stringify({ type: 'object', required: ['simulated', 'error'] })
        },
        {
          name: 'Optional Flaky Service (50% Failure)', method: 'GET', path: '/chaos/simulate-flaky',
          expectedStatus: 200, maxLatencyMs: 1500, orderIndex: 2, active: false
        }
      ] }
    }
  });
  console.log('Seed local concluído. Coleções existentes e histórico preservados.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
