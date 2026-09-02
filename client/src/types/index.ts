export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
export type RunStatus = 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED';

export interface TestCase {
  id: string;
  suiteId: string;
  name: string;
  method: HttpMethod;
  path: string;
  headers?: string | null;
  body?: string | null;
  expectedStatus: number;
  maxLatencyMs: number;
  expectedSchema?: string | null;
  orderIndex: number;
  active: boolean;
}

export interface TestSuite {
  id: string;
  workspaceId: string;
  name: string;
  description?: string | null;
  baseUrl: string;
  headers?: string | null;
  cases: TestCase[];
  runs?: Array<{
    id: string;
    status: RunStatus;
    successRate: number;
    p95LatencyMs: number;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface TestAssertion {
  id: string;
  runId: string;
  caseId: string;
  name: string;
  method: HttpMethod;
  endpoint: string;
  actualStatus: number;
  expectedStatus: number;
  statusMatch: boolean;
  latencyMs: number;
  slaPassed: boolean;
  schemaValid: boolean;
  errorMessage?: string | null;
  responseBody?: string | null;
  createdAt: string;
}

export interface TestRun {
  id: string;
  workspaceId: string;
  suiteId: string;
  status: RunStatus;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDurationMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  successRate: number;
  triggeredBy: string;
  createdAt: string;
  completedAt?: string | null;
  suite?: {
    id: string;
    name: string;
    baseUrl: string;
  };
  assertions?: TestAssertion[];
}

export interface OverviewMetrics {
  totalSuites: number;
  totalRuns: number;
  totalCases: number;
  avgSuccessRate: string;
  avgP95LatencyMs: string;
  recentRuns: Array<{
    status: RunStatus;
    successRate: number;
    p95LatencyMs: number;
    totalDurationMs: number;
    createdAt: string;
  }>;
}
