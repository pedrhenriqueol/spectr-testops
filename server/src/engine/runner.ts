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

  let dynamicToken: string | null = null;

  for (const testCase of suite.cases) {
    const url = testCase.path.startsWith('http://') || testCase.path.startsWith('https://')
      ? testCase.path
      : suite.baseUrl.replace(/\/+$/, '') + '/' + testCase.path.replace(/^\/+/, '');

    if (dynamicToken) {
      globalHeaders['Authorization'] = `Bearer ${dynamicToken}`;
    }
    
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
      const timeoutId = setTimeout(() => controller.abort(), 15000);

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
        if (responseBody) {
          try {
            const parsed = JSON.parse(responseBody);
            if (parsed && typeof parsed === 'object' && parsed.token) {
              dynamicToken = parsed.token;
            }
          } catch {
            // ignore
          }
        }
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

      // Na nuvem (Render free), se o status HTTP e o schema baterem, consideramos o teste funcional APROVADO, registrando o warning de SLA
      if (statusMatch && schemaValid) {
        passedCount++;
      } else {
        failedCount++;
        if (!statusMatch) {
          errorMessage = `Status HTTP ${actualStatus} recebido, esperado ${testCase.expectedStatus}.`;
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


export interface SingleCaseResult {
  caseId: string;
  name: string;
  method: string;
  url: string;
  actualStatus: number;
  statusText: string;
  statusMatch: boolean;
  expectedStatus: number;
  latencyMs: number;
  slaPassed: boolean;
  maxLatencyMs: number;
  schemaValid: boolean;
  responseHeaders: Record<string, string>;
  responseBody: any;
  rawBody: string;
  responseSize: string;
  errorMessage: string | null;
  timestamp: string;
}

export async function executeSingleTestCase(caseId: string): Promise<SingleCaseResult> {
  const testCase = await prisma.testCase.findUnique({
    where: { id: caseId },
    include: { suite: true }
  });

  if (!testCase) {
    throw new Error('Caso de teste não encontrado.');
  }

  const suite = testCase.suite;
  let globalHeaders: Record<string, string> = {};
  if (suite.headers) {
    try {
      globalHeaders = JSON.parse(suite.headers);
    } catch {
      globalHeaders = {};
    }
  }

  // Se a rota não for pública e a suíte tiver um caso de login, executa login automático para obter o Bearer token
  let dynamicToken: string | null = null;
  const isAuthCase = testCase.path.includes('/auth/login') || testCase.path.includes('/login');
  if (!isAuthCase) {
    const loginCase = await prisma.testCase.findFirst({
      where: {
        suiteId: suite.id,
        path: { contains: 'login' },
        method: 'POST'
      }
    });

    if (loginCase && loginCase.body) {
      try {
        const loginUrl = loginCase.path.startsWith('http://') || loginCase.path.startsWith('https://')
          ? loginCase.path
          : suite.baseUrl.replace(/\/+$/, '') + '/' + loginCase.path.replace(/^\/+/, '');

        const loginRes = await fetch(loginUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...globalHeaders },
          body: loginCase.body,
          signal: AbortSignal.timeout(10000)
        });

        if (loginRes.ok) {
          const loginData: any = await loginRes.json();
          if (loginData && loginData.token) {
            dynamicToken = loginData.token;
          }
        }
      } catch (err) {
        // ignora falha de auto-login e prossegue
      }
    }
  }

  const url = testCase.path.startsWith('http://') || testCase.path.startsWith('https://')
    ? testCase.path
    : suite.baseUrl.replace(/\/+$/, '') + '/' + testCase.path.replace(/^\/+/, '');

  if (dynamicToken) {
    globalHeaders['Authorization'] = `Bearer ${dynamicToken}`;
  }

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
  let statusText = '';
  let responseBodyText = '';
  let responseHeadersObj: Record<string, string> = {};
  let errorMessage: string | null = null;
  let statusMatch = false;
  let slaPassed = false;
  let schemaValid = true;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      method: testCase.method.toUpperCase(),
      headers: caseHeaders,
      body: requestBody,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const latencyMs = Date.now() - testStartTime;
    actualStatus = response.status;
    statusText = response.statusText || (response.ok ? 'OK' : 'Error');
    statusMatch = actualStatus === testCase.expectedStatus;
    slaPassed = latencyMs <= testCase.maxLatencyMs;

    // Headers de resposta
    response.headers.forEach((val, key) => {
      responseHeadersObj[key] = val;
    });

    try {
      responseBodyText = await response.text();
    } catch {
      responseBodyText = '';
    }

    let parsedBody: any = responseBodyText;
    try {
      parsedBody = JSON.parse(responseBodyText);
    } catch {
      // não é JSON
    }

    // Validação de JSON Schema se configurado
    if (testCase.expectedSchema && parsedBody && typeof parsedBody === 'object') {
      try {
        const schema = JSON.parse(testCase.expectedSchema);
        if (schema.required && Array.isArray(schema.required)) {
          for (const field of schema.required) {
            if (parsedBody[field] === undefined) {
              schemaValid = false;
              errorMessage = `Campo obrigatório ausente no contrato: ${field}`;
              break;
            }
          }
        }
      } catch {
        schemaValid = false;
      }
    }

    const sizeBytes = new TextEncoder().encode(responseBodyText).length;
    const responseSize = sizeBytes > 1024 ? `${(sizeBytes / 1024).toFixed(2)} KB` : `${sizeBytes} B`;

    return {
      caseId: testCase.id,
      name: testCase.name,
      method: testCase.method,
      url,
      actualStatus,
      statusText,
      statusMatch,
      expectedStatus: testCase.expectedStatus,
      latencyMs,
      slaPassed,
      maxLatencyMs: testCase.maxLatencyMs,
      schemaValid,
      responseHeaders: responseHeadersObj,
      responseBody: parsedBody,
      rawBody: responseBodyText,
      responseSize,
      errorMessage,
      timestamp: new Date().toISOString()
    };
  } catch (err: any) {
    const latencyMs = Date.now() - testStartTime;
    const isTimeout = err.name === 'AbortError';
    return {
      caseId: testCase.id,
      name: testCase.name,
      method: testCase.method,
      url,
      actualStatus: 0,
      statusText: isTimeout ? 'Network Timeout' : 'Connection Error',
      statusMatch: false,
      expectedStatus: testCase.expectedStatus,
      latencyMs,
      slaPassed: false,
      maxLatencyMs: testCase.maxLatencyMs,
      schemaValid: false,
      responseHeaders: {},
      responseBody: { error: isTimeout ? 'Timeout de rede excedido (15s).' : err.message },
      rawBody: err.message,
      responseSize: '0 B',
      errorMessage: isTimeout ? 'Timeout de rede excedido.' : (err.message || 'Falha de conexão.'),
      timestamp: new Date().toISOString()
    };
  }
}
