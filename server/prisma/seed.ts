import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Semeando dados de demonstração do Spectr TestOps...');

  // 1. Workspace
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'enterprise-core' },
    update: {},
    create: {
      name: 'Enterprise QA Workspace',
      slug: 'enterprise-core',
      apiKey: 'spk_live_77c8e2b9f3014a5d89'
    }
  });

  // 2. Test Suite
  const suite = await prisma.testSuite.create({
    data: {
      workspaceId: workspace.id,
      name: 'E-Commerce Core & Checkout Resilience Suite',
      description: 'Bateria de validação de endpoints transacionais, SLA de latência (p95 < 250ms) e simulação de resiliência a falhas.',
      baseUrl: 'http://localhost:3335/api/v1',
      headers: JSON.stringify({
        'Authorization': 'Bearer test-token-qa-demo',
        'X-Client-Id': 'spectr-runner-v1'
      })
    }
  });

  // 3. Test Cases
  const casesData = [
    {
      name: 'Health Check & Gateway Liveness',
      method: 'GET',
      path: '/chaos/echo',
      expectedStatus: 200,
      maxLatencyMs: 150,
      expectedSchema: JSON.stringify({ required: ['method', 'url', 'timestamp'] }),
      orderIndex: 0
    },
    {
      name: 'Simulação de Latência & SLA Compliance',
      method: 'GET',
      path: '/chaos/simulate-delay?delay=80',
      expectedStatus: 200,
      maxLatencyMs: 300,
      expectedSchema: JSON.stringify({ required: ['simulated', 'delayInjectedMs'] }),
      orderIndex: 1
    },
    {
      name: 'Validação de Contrato & Echo Payload',
      method: 'POST',
      path: '/chaos/echo',
      body: JSON.stringify({ transactionId: 'tx_98214', amount: 1250.00, currency: 'BRL' }),
      expectedStatus: 200,
      maxLatencyMs: 200,
      expectedSchema: JSON.stringify({ required: ['method', 'body', 'timestamp'] }),
      orderIndex: 2
    },
    {
      name: 'Chaos Injection: Injeção de Falha 503',
      method: 'GET',
      path: '/chaos/simulate-error?code=503',
      expectedStatus: 503,
      maxLatencyMs: 200,
      expectedSchema: JSON.stringify({ required: ['simulated', 'error'] }),
      orderIndex: 3
    },
    {
      name: 'Chaos Injection: Teste de Resiliência Flaky',
      method: 'GET',
      path: '/chaos/simulate-flaky',
      expectedStatus: 200,
      maxLatencyMs: 400,
      orderIndex: 4
    }
  ];

  for (const c of casesData) {
    await prisma.testCase.create({
      data: {
        suiteId: suite.id,
        ...c
      }
    });
  }

  console.log('✅ Seed finalizado com sucesso! Workspace e Suíte criados.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
