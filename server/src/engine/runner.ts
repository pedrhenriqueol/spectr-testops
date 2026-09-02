import { prisma } from '../shared/prisma.js';

interface RunResult {
  runId: string;
  status: 'PASSED' | 'FAILED';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDurationMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  successRate: number;
}

export async function executeTestSuite(suiteId: string, workspaceId: string, triggeredBy = 'MANUAL'): Promise<RunResult> {
  const suite = await prisma.testSuite.findFirst({
    where: { id: suiteId, workspaceId },
    include: {
      cases: {
        where: { active: true },
        orderBy: { orderIndex: 'asc' }
      }
    }
  });

  if (!suite) {
    throw new Error('Suíte de testes não encontrada.');
  }

  // Cria o registro da execução
  const run = await prisma.testRun.create({
    data: {
      workspaceId,
      suiteId,
      status: 'RUNNING',
      totalTests: suite.cases.length,
      triggeredBy
    }
  });

  const startTime = Date.now();
  const latencies: number[] = [];
  let passedCount = 0;
  let failedCount = 0;

  // Parse dos headers globais
  let globalHeaders: Record<string, string> = {};
  if (suite.headers) {
    try {
      globalHeaders = JSON.parse(suite.headers);
    } catch {
      globalHeaders = {};
    }
  }

  for (const testCase of suite.cases) {
    const url = testCase.path.startsWith('http://') || testCase.path.startsWith('https://')
      ? testCase.path
      : suite.baseUrl.replace(/\/+$/, '') + '/' + testCase.path.replace(/^\/+/, '');
    
    let caseHeaders: Record<string, string> = { ...globalHeaders };
    if (testCase.headers) {
      try {
        caseHeaders = { ...caseHeaders, ...JSON.parse(testCase.headers) };
      } catch {
        // ignora
      }
    }

    let requestBody: string | undefined = undefined;
    if (['POST', 'PUT', 'PATCH'].includes(testCase.method.toUpperCase()) && testCase.body) {
      requestBody = testCase.body;
      if (!caseHeaders['Content-Type']) {
        caseHeaders['Content-Type'] = 'application/json';
      }
    }

    const testStartTime = Date.now();
    let actualStatus = 0;
    let responseBody = '';
    let errorMessage: string | null = null;
    let statusMatch = false;
    let slaPassed = false;
    let schemaValid = true;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), (testCase.maxLatencyMs * 2) || 10000);

      const response = await fetch(url, {
        method: testCase.method.toUpperCase(),
        headers: caseHeaders,
        body: requestBody,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const testDuration = Date.now() - testStartTime;
      latencies.push(testDuration);
      actualStatus = response.status;
      statusMatch = actualStatus === testCase.expectedStatus;
      slaPassed = testDuration <= testCase.maxLatencyMs;

      try {
        responseBody = await response.text();
      } catch {
        responseBody = '';
      }

      // Validação básica de JSON Schema se fornecido
      if (testCase.expectedSchema && responseBody) {
        try {
          const parsed = JSON.parse(responseBody);
          const schema = JSON.parse(testCase.expectedSchema);
          if (schema.required && Array.isArray(schema.required)) {
            for (const field of schema.required) {
              if (parsed[field] === undefined) {
                schemaValid = false;
                errorMessage = `Campo obrigatório ausente: ${field}`;
                break;
              }
            }
          }
        } catch {
          schemaValid = false;
          errorMessage = 'Falha ao validar schema JSON da resposta.';
        }
      }

      if (statusMatch && slaPassed && schemaValid) {
        passedCount++;
      } else {
        failedCount++;
        if (!statusMatch) {
          errorMessage = `Status HTTP ${actualStatus} recebido, esperado ${testCase.expectedStatus}.`;
        } else if (!slaPassed) {
          errorMessage = `Latência de ${testDuration}ms excedeu SLA máximo de ${testCase.maxLatencyMs}ms.`;
        }
      }

      await prisma.testAssertion.create({
        data: {
          runId: run.id,
          caseId: testCase.id,
          name: testCase.name,
          method: testCase.method.toUpperCase(),
          endpoint: testCase.path,
          actualStatus,
          expectedStatus: testCase.expectedStatus,
          statusMatch,
          latencyMs: testDuration,
          slaPassed,
          schemaValid,
          errorMessage,
          responseBody: responseBody.slice(0, 1000)
        }
      });
    } catch (err: any) {
      const testDuration = Date.now() - testStartTime;
      latencies.push(testDuration);
      failedCount++;
      actualStatus = 0;
      errorMessage = err.name === 'AbortError' ? 'Timeout de rede excedido.' : err.message || 'Falha de conexão.';

      await prisma.testAssertion.create({
        data: {
          runId: run.id,
          caseId: testCase.id,
          name: testCase.name,
          method: testCase.method.toUpperCase(),
          endpoint: testCase.path,
          actualStatus,
          expectedStatus: testCase.expectedStatus,
          statusMatch: false,
          latencyMs: testDuration,
          slaPassed: false,
          schemaValid: false,
          errorMessage,
          responseBody: null
        }
      });
    }
  }

  const totalDuration = Date.now() - startTime;

  // Cálculo de percentis de latência
  latencies.sort((a, b) => a - b);
  const p95Index = Math.floor(latencies.length * 0.95);
  const p99Index = Math.floor(latencies.length * 0.99);
  const p95 = latencies.length > 0 ? latencies[p95Index] || latencies[latencies.length - 1] : 0;
  const p99 = latencies.length > 0 ? latencies[p99Index] || latencies[latencies.length - 1] : 0;

  const totalTests = suite.cases.length;
  const successRate = totalTests > 0 ? Number(((passedCount / totalTests) * 100).toFixed(1)) : 0;
  const finalStatus = failedCount === 0 ? 'PASSED' : 'FAILED';

  await prisma.testRun.update({
    where: { id: run.id },
    data: {
      status: finalStatus,
      passedTests: passedCount,
      failedTests: failedCount,
      totalDurationMs: totalDuration,
      p95LatencyMs: p95,
      p99LatencyMs: p99,
      successRate,
      completedAt: new Date()
    }
  });

  return {
    runId: run.id,
    status: finalStatus,
    totalTests,
    passedTests: passedCount,
    failedTests: failedCount,
    totalDurationMs: totalDuration,
    p95LatencyMs: p95,
    p99LatencyMs: p99,
    successRate
  };
}
