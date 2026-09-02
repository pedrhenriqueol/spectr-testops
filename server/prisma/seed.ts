import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Semeando suítes de teste do Spectr TestOps...');

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

  // Limpa suítes anteriores para recriar de forma limpa
  await prisma.testSuite.deleteMany({ where: { workspaceId: workspace.id } });

  // 2. SUÍTE 1: PayStream Gateway ── Core Banking & Resilience Suite
  const paystreamSuite = await prisma.testSuite.create({
    data: {
      workspaceId: workspace.id,
      name: 'PayStream Gateway ── Core Banking & Resilience Suite',
      description: 'Validação de ponta a ponta dos endpoints transacionais do PayStream: healthcheck de liveness, login com JWT, ledger de transações, split de sellers e disparo de webhook assinado HMAC-SHA256.',
      baseUrl: 'https://paystream-gateway.onrender.com/api/v1',
      headers: JSON.stringify({
        'Accept': 'application/json',
        'X-Client-Auditor': 'Spectr-TestOps-v1'
      })
    }
  });

  const paystreamCases = [
    {
      name: 'PayStream Gateway Liveness & Healthcheck',
      method: 'GET',
      path: 'https://paystream-gateway.onrender.com/health',
      expectedStatus: 200,
      maxLatencyMs: 1000,
      expectedSchema: JSON.stringify({ required: ['status', 'service'] }),
      orderIndex: 0
    },
    {
      name: 'Merchant Authentication & Token Generation',
      method: 'POST',
      path: '/auth/login',
      body: JSON.stringify({
        merchantSlug: 'techstore',
        email: 'admin@techstore.com',
        password: 'pedrooliveira1227!'
      }),
      expectedStatus: 200,
      maxLatencyMs: 1500,
      expectedSchema: JSON.stringify({ required: ['token', 'merchant'] }),
      orderIndex: 1
    },
    {
      name: 'Transactions Ledger & Concurrent TPV Audit',
      method: 'GET',
      path: '/transactions',
      expectedStatus: 200,
      maxLatencyMs: 1500,
      orderIndex: 2
    },
    {
      name: 'Split Engine: Sellers & Marketplace Recipients',
      method: 'GET',
      path: '/recipients',
      expectedStatus: 200,
      maxLatencyMs: 1500,
      orderIndex: 3
    },
    {
      name: 'Signed HMAC Webhook Ping Verification',
      method: 'POST',
      path: '/webhooks/test-ping',
      body: JSON.stringify({
        event: 'transaction.paid',
        amount: 1500.00
      }),
      expectedStatus: 200,
      maxLatencyMs: 1500,
      orderIndex: 4
    }
  ];

  for (const c of paystreamCases) {
    await prisma.testCase.create({
      data: {
        suiteId: paystreamSuite.id,
        ...c
      }
    });
  }

  // 3. SUÍTE 2: E-Commerce Core & Checkout Resilience Suite (Chaos & Echo Interno)
  const chaosSuite = await prisma.testSuite.create({
    data: {
      workspaceId: workspace.id,
      name: 'E-Commerce Core & Chaos Resilience Suite',
      description: 'Bateria interna de simulação de falhas de infraestrutura, injeção de atrasos artificiais e testes de tolerância a instabilidade.',
      baseUrl: 'http://localhost:3335/api/v1',
      headers: JSON.stringify({
        'Authorization': 'Bearer test-token-qa-demo',
        'X-Client-Id': 'spectr-runner-v1'
      })
    }
  });

  const chaosCases = [
    {
      name: 'Health Check & Gateway Echo Liveness',
      method: 'GET',
      path: '/chaos/echo',
      expectedStatus: 200,
      maxLatencyMs: 150,
      expectedSchema: JSON.stringify({ required: ['method', 'url', 'timestamp'] }),
      orderIndex: 0
    },
    {
      name: 'Simulação de Latência de Rede (80ms)',
      method: 'GET',
      path: '/chaos/simulate-delay?delay=80',
      expectedStatus: 200,
      maxLatencyMs: 1500,
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
      name: 'Chaos Injection: Injeção de Falha 503 Service Unavailable',
      method: 'GET',
      path: '/chaos/simulate-error?code=503',
      expectedStatus: 503,
      maxLatencyMs: 200,
      expectedSchema: JSON.stringify({ required: ['simulated', 'error'] }),
      orderIndex: 3
    },
    {
      name: 'Chaos Injection: Teste de Resiliência Flaky (50% Drop)',
      method: 'GET',
      path: '/chaos/simulate-flaky',
      expectedStatus: 200,
      maxLatencyMs: 1500,
      orderIndex: 4
    }
  ];

  for (const c of chaosCases) {
    await prisma.testCase.create({
      data: {
        suiteId: chaosSuite.id,
        ...c
      }
    });
  }

  console.log('✅ Seed finalizado com sucesso! Suíte do PayStream e Suíte de Caos criadas.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
