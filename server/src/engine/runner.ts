import type { TestCase, TestSuite } from '@prisma/client';
import { prisma } from '../shared/prisma.js';
import { AppError } from '../shared/errors/AppError.js';
import { normalizeCaseOverrides, type CaseExecutionOverrides } from '../shared/test-case.js';
import { safeFetch } from '../security/safeFetch.js';

import { calculatePercentiles, validateContractSchema } from './contracts.js';
export { calculatePercentiles, validateContractSchema } from './contracts.js';

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

export async function executeTestSuite(
  suiteId: string,
  workspaceId: string,
  triggeredBy = 'MANUAL',
  baseUrl?: string
): Promise<RunResult> {
  const suite = await prisma.testSuite.findFirst({
    where: { id: suiteId, workspaceId },
    include: { cases: { where: { active: true }, orderBy: { orderIndex: 'asc' } } }
  });
  if (!suite) throw new AppError('Suíte de testes não encontrada.', 404);
  if (suite.cases.length === 0) throw new AppError('A suíte não possui casos de teste ativos.', 400);

  const run = await prisma.testRun.create({
    data: { workspaceId, suiteId, status: 'RUNNING', totalTests: suite.cases.length, triggeredBy }
  });
  const startTime = Date.now();
  const latencies: number[] = [];
  let passedCount = 0;
  let failedCount = 0;
  let dynamicToken: string | null = null;
  let tokenOrigin: string | null = null;

  try {
    for (const testCase of suite.cases) {
      const targetOrigin = originOf(resolveUrl(testCase, suite, baseUrl));
      const scopedToken = targetOrigin && targetOrigin === tokenOrigin ? dynamicToken : null;
      const result = await executeRequest(testCase, suite, scopedToken, baseUrl);
      const token = tokenFromBody(result.responseBody);
      if (result.actualStatus >= 200 && result.actualStatus < 300 && token) {
        dynamicToken = token;
        tokenOrigin = originOf(result.url);
      }
      latencies.push(result.latencyMs);
      const passed = result.statusMatch && result.slaPassed && result.schemaValid;
      if (passed) passedCount++;
      else failedCount++;

      // Persistence errors must not be reclassified as network failures or counted twice.
      await prisma.testAssertion.create({
        data: {
          runId: run.id,
          caseId: testCase.id,
          name: testCase.name,
          method: result.method,
          endpoint: testCase.path,
          actualStatus: result.actualStatus,
          expectedStatus: result.expectedStatus,
          statusMatch: result.statusMatch,
          latencyMs: result.latencyMs,
          slaPassed: result.slaPassed,
          schemaValid: result.schemaValid,
          errorMessage: result.errorMessage,
          responseBody: result.rawBody.slice(0, 1000)
        }
      });
    }

    const totalDurationMs = Date.now() - startTime;
    const metrics = calculatePercentiles(latencies);
    const successRate = Number(((passedCount / suite.cases.length) * 100).toFixed(1));
    const status = failedCount === 0 ? 'PASSED' : 'FAILED';
    await prisma.testRun.update({
      where: { id: run.id },
      data: {
        status,
        passedTests: passedCount,
        failedTests: failedCount,
        totalDurationMs,
        p95LatencyMs: metrics.p95,
        p99LatencyMs: metrics.p99,
        successRate,
        completedAt: new Date()
      }
    });
    return {
      runId: run.id, status, totalTests: suite.cases.length, passedTests: passedCount,
      failedTests: failedCount, totalDurationMs, p50LatencyMs: metrics.p50,
      p90LatencyMs: metrics.p90, p95LatencyMs: metrics.p95, p99LatencyMs: metrics.p99, successRate
    };
  } catch (error) {
    await prisma.testRun.update({
      where: { id: run.id },
      data: { status: 'FAILED', completedAt: new Date(), totalDurationMs: Date.now() - startTime }
    });
    throw error;
  }
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
  responseBody: unknown;
  rawBody: string;
  responseSize: string;
  errorMessage: string | null;
  timestamp: string;
}

function parseHeaders(value: string | null): Record<string, string> {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
  } catch {
    return {};
  }
}

function tokenFromBody(body: unknown): string | null {
  if (body && typeof body === 'object' && 'token' in body && typeof body.token === 'string') return body.token;
  return null;
}

function originOf(url: string): string | null {
  try { return new URL(url).origin; } catch { return null; }
}

function resolveUrl(testCase: TestCase, suite: TestSuite, baseUrl?: string) {
  return /^https?:\/\//i.test(testCase.path)
    ? testCase.path
    : (baseUrl ?? suite.baseUrl).replace(/\/+$/, '') + '/' + testCase.path.replace(/^\/+/, '');
}

async function executeRequest(
  testCase: TestCase,
  suite: TestSuite,
  dynamicToken: string | null = null,
  baseUrl?: string
): Promise<SingleCaseResult> {
  const url = resolveUrl(testCase, suite, baseUrl);
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const headers = new Headers(parseHeaders(suite.headers));
    if (dynamicToken) headers.set('Authorization', `Bearer ${dynamicToken}`);
    for (const [name, value] of Object.entries(parseHeaders(testCase.headers))) headers.set(name, value);
    const method = testCase.method.toUpperCase();
    const body = !['GET', 'HEAD'].includes(method) ? testCase.body ?? undefined : undefined;
    if (body !== undefined && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    const response = await safeFetch(url, { method, headers, body, signal: controller.signal });
    // The timeout and SLA include the entire response body, not just its headers.
    const rawBody = await response.text();
    const latencyMs = Date.now() - startTime;
    let responseBody: unknown = rawBody;
    let validJson = false;
    try {
      responseBody = JSON.parse(rawBody);
      validJson = true;
    } catch { /* Plain text responses are allowed unless a JSON contract was configured. */ }

    let schemaValid = true;
    let errorMessage: string | null = null;
    if (testCase.expectedSchema !== null) {
      if (!validJson) {
        schemaValid = false;
        errorMessage = 'Falha ao validar formato JSON do payload de resposta contra o contrato OpenAPI.';
      } else {
        try {
          const validation = validateContractSchema(responseBody, JSON.parse(testCase.expectedSchema));
          schemaValid = validation.valid;
          errorMessage = validation.errorMessage;
        } catch {
          schemaValid = false;
          errorMessage = 'Schema JSON configurado no teste é inválido.';
        }
      }
    }
    const statusMatch = response.status === testCase.expectedStatus;
    const slaPassed = latencyMs <= testCase.maxLatencyMs;
    if (!errorMessage && !statusMatch) errorMessage = `Status HTTP ${response.status} recebido, esperado ${testCase.expectedStatus}.`;
    if (!errorMessage && !slaPassed) errorMessage = `SLA excedido: ${latencyMs}ms, limite de ${testCase.maxLatencyMs}ms.`;
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, name) => { responseHeaders[name] = value; });
    const sizeBytes = new TextEncoder().encode(rawBody).length;
    return {
      caseId: testCase.id, name: testCase.name, method, url: response.url || url,
      actualStatus: response.status, statusText: response.statusText || (response.ok ? 'OK' : 'Error'),
      statusMatch, expectedStatus: testCase.expectedStatus, latencyMs, slaPassed,
      maxLatencyMs: testCase.maxLatencyMs, schemaValid,
      responseHeaders, responseBody, rawBody,
      responseSize: sizeBytes > 1024 ? `${(sizeBytes / 1024).toFixed(2)} KB` : `${sizeBytes} B`,
      errorMessage, timestamp: new Date().toISOString()
    };
  } catch (error) {
    const isTimeout = controller.signal.aborted;
    const message = isTimeout ? 'Timeout de rede excedido (15s).' : error instanceof Error ? error.message : 'Falha de conexão.';
    return {
      caseId: testCase.id, name: testCase.name, method: testCase.method, url,
      actualStatus: 0, statusText: isTimeout ? 'Network Timeout' : 'Connection Error',
      statusMatch: false, expectedStatus: testCase.expectedStatus, latencyMs: Date.now() - startTime,
      slaPassed: false, maxLatencyMs: testCase.maxLatencyMs, schemaValid: false,
      responseHeaders: {}, responseBody: { error: message }, rawBody: message,
      responseSize: '0 B', errorMessage: message, timestamp: new Date().toISOString()
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function executeSingleTestCase(
  caseId: string,
  baseUrl?: string,
  overrides?: CaseExecutionOverrides
): Promise<SingleCaseResult> {
  const savedCase = await prisma.testCase.findUnique({ where: { id: caseId }, include: { suite: true } });
  if (!savedCase) throw new AppError('Caso de teste não encontrado.', 404);
  const suite = savedCase.suite;
  // Draft edits are scoped to this invocation. The stored request and suite remain untouched.
  const testCase = { ...savedCase, ...normalizeCaseOverrides(overrides ?? {}) };
  let dynamicToken: string | null = null;
  const isAuthCase = testCase.path.includes('/auth/login') || testCase.path.includes('/login');
  if (!isAuthCase) {
    const loginCase = await prisma.testCase.findFirst({
      where: { suiteId: suite.id, path: { contains: 'login' }, method: 'POST', active: true },
      orderBy: { orderIndex: 'asc' }
    });
    const targetOrigin = originOf(resolveUrl(testCase, suite, baseUrl));
    if (loginCase?.body && targetOrigin && originOf(resolveUrl(loginCase, suite, baseUrl)) === targetOrigin) {
      const loginResult = await executeRequest(loginCase, suite, null, baseUrl);
      if (loginResult.actualStatus >= 200 && loginResult.actualStatus < 300 && originOf(loginResult.url) === targetOrigin) {
        dynamicToken = tokenFromBody(loginResult.responseBody);
      }
    }
  }
  return executeRequest(testCase, suite, dynamicToken, baseUrl);
}
