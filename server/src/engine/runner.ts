import { prisma } from '../shared/prisma.js';

export interface LatencyMetrics {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  avg: number;
}

/**
 * Cálculo estatístico determinístico de percentis de latência (p50, p90, p95, p99)
 * Utiliza o método Nearest Rank padronizado (NIST / Datadog / K6).
 */
export function calculatePercentiles(latencies: number[]): LatencyMetrics {
  if (!latencies || latencies.length === 0) {
    return { p50: 0, p90: 0, p95: 0, p99: 0, min: 0, max: 0, avg: 0 };
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const n = sorted.length;

  const getRankValue = (percentile: number) => {
    const rank = Math.ceil((percentile / 100) * n) - 1;
    return sorted[Math.max(0, Math.min(n - 1, rank))];
  };

  const sum = sorted.reduce((acc, val) => acc + val, 0);

  return {
    p50: getRankValue(50),
    p90: getRankValue(90),
    p95: getRankValue(95),
    p99: getRankValue(99),
    min: sorted[0],
    max: sorted[n - 1],
    avg: Math.round(sum / n)
  };
}

export interface ContractValidationResult {
  valid: boolean;
  errorMessage: string | null;
}

/**
 * Validador recursivo de conformidade OpenAPI / JSON Schema.
 * Suporta objetos aninhados, arrays tipados, validação de tipos primitivos e campos obrigatórios.
 */
export function validateContractSchema(data: any, schema: any, path = 'root'): ContractValidationResult {
  if (!schema || typeof schema !== 'object') {
    return { valid: true, errorMessage: null };
  }

  // 1. Validação de tipo de dado
  if (schema.type) {
    const expectedType = schema.type;
    const actualType = Array.isArray(data) ? 'array' : data === null ? 'null' : typeof data;

    if (expectedType === 'integer') {
      if (typeof data !== 'number' || !Number.isInteger(data)) {
        return {
          valid: false,
          errorMessage: `Falha de contrato em '${path}': esperado 'integer', recebido '${actualType}' (${data}).`
        };
      }
    } else if (expectedType === 'number') {
      if (typeof data !== 'number' || isNaN(data)) {
        return {
          valid: false,
          errorMessage: `Falha de contrato em '${path}': esperado 'number', recebido '${actualType}'.`
        };
      }
    } else if (expectedType !== actualType) {
      return {
        valid: false,
        errorMessage: `Falha de contrato em '${path}': esperado '${expectedType}', recebido '${actualType}'.`
      };
    }
  }

  // 2. Validação de campos obrigatórios (required)
  if (schema.required && Array.isArray(schema.required)) {
    if (typeof data !== 'object' || data === null) {
      return {
        valid: false,
        errorMessage: `Falha de contrato em '${path}': esperado objeto para verificar campos obrigatórios.`
      };
    }

    for (const field of schema.required) {
      if (data[field] === undefined) {
        return {
          valid: false,
          errorMessage: `Campo obrigatório ausente no contrato: '${path === 'root' ? field : `${path}.${field}`}'.`
        };
      }
    }
  }

  // 3. Validação de propriedades aninhadas (properties)
  if (schema.properties && typeof data === 'object' && data !== null && !Array.isArray(data)) {
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      if (data[propName] !== undefined) {
        const subResult = validateContractSchema(
          data[propName],
          propSchema,
          path === 'root' ? propName : `${path}.${propName}`
        );
        if (!subResult.valid) {
          return subResult;
        }
      }
    }
  }

  // 4. Validação de arrays tipados (items)
  if (schema.items && Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      const itemResult = validateContractSchema(data[i], schema.items, `${path}[${i}]`);
      if (!itemResult.valid) {
        return itemResult;
      }
    }
  }

  return { valid: true, errorMessage: null };
}

export interface RunResult {
  runId: string;
  status: 'PASSED' | 'FAILED';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDurationMs: number;
  p50LatencyMs: number;
  p90LatencyMs: number;
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

      // Validação estrita de contrato OpenAPI / JSON Schema
      if (testCase.expectedSchema && responseBody) {
        try {
          const parsed = JSON.parse(responseBody);
          const schema = JSON.parse(testCase.expectedSchema);
          const contractRes = validateContractSchema(parsed, schema);
          if (!contractRes.valid) {
            schemaValid = false;
            errorMessage = contractRes.errorMessage;
          }
        } catch {
          schemaValid = false;
          errorMessage = 'Falha ao validar formato JSON do payload de resposta contra o contrato OpenAPI.';
        }
      }

      if (statusMatch && schemaValid) {
        passedCount++;
      } else {
        failedCount++;
        if (!statusMatch && !errorMessage) {
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
      errorMessage = err.name === 'AbortError' ? 'Timeout de rede excedido (15s).' : err.message || 'Falha de conexão.';

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
  const metrics = calculatePercentiles(latencies);

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
      p95LatencyMs: metrics.p95,
      p99LatencyMs: metrics.p99,
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
    p50LatencyMs: metrics.p50,
    p90LatencyMs: metrics.p90,
    p95LatencyMs: metrics.p95,
    p99LatencyMs: metrics.p99,
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
      } catch {
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

    // Validação estrita de JSON Schema / OpenAPI
    if (testCase.expectedSchema && parsedBody && typeof parsedBody === 'object') {
      try {
        const schema = JSON.parse(testCase.expectedSchema);
        const contractRes = validateContractSchema(parsedBody, schema);
        if (!contractRes.valid) {
          schemaValid = false;
          errorMessage = contractRes.errorMessage;
        }
      } catch {
        schemaValid = false;
        errorMessage = 'Schema JSON configurado no teste é inválido.';
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
