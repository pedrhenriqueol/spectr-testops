import type { TestCase } from '@prisma/client';
import { z } from 'zod';

const httpUrlSchema = z.string().url().refine((value) => /^https?:\/\//i.test(value));
const methodSchema = z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']);
const pathSchema = z.string().trim().min(1).refine(
  (value) => !/^[a-z][a-z\d+.-]*:/i.test(value) || httpUrlSchema.safeParse(value).success,
  'O endpoint deve ser um caminho ou uma URL HTTP/HTTPS.'
);
const nameSchema = z.string().trim().min(2);
const headersSchema = z.record(z.string());
const contractSchema = z.union([z.record(z.unknown()), z.boolean()]);
const expectedStatusSchema = z.number().int().min(100).max(599);
const maxLatencySchema = z.number().int().positive().max(300000);
const orderIndexSchema = z.number().int().nonnegative().max(2147483647);

export const caseCreateSchema = z.object({
  name: nameSchema,
  method: methodSchema,
  path: pathSchema,
  headers: headersSchema.optional(),
  body: z.unknown().optional(),
  expectedStatus: expectedStatusSchema.default(200),
  maxLatencyMs: maxLatencySchema.default(500),
  expectedSchema: contractSchema.optional(),
  active: z.boolean().default(true),
  orderIndex: orderIndexSchema.optional()
});

// Execution previews and PATCH preserve omitted fields and use null to clear saved JSON.
export const caseExecutionOverridesSchema = z.object({
  method: methodSchema.optional(),
  path: pathSchema.optional(),
  headers: headersSchema.nullable().optional(),
  body: z.unknown().optional(),
  expectedStatus: expectedStatusSchema.optional(),
  maxLatencyMs: maxLatencySchema.optional(),
  expectedSchema: contractSchema.nullable().optional()
}).strict();

export const casePatchSchema = caseExecutionOverridesSchema.extend({
  name: nameSchema.optional(),
  active: z.boolean().optional(),
  orderIndex: orderIndexSchema.optional()
});

export type CaseExecutionOverrides = z.infer<typeof caseExecutionOverridesSchema>;
type CasePatchInput = z.infer<typeof casePatchSchema>;
type NormalizedCaseOverrides = Partial<Pick<TestCase,
  'name' | 'method' | 'path' | 'headers' | 'body' | 'expectedStatus' | 'maxLatencyMs' | 'expectedSchema' | 'active' | 'orderIndex'
>>;

export function normalizeCaseOverrides(input: CasePatchInput): NormalizedCaseOverrides {
  const normalized: NormalizedCaseOverrides = {};
  if (input.name !== undefined) normalized.name = input.name;
  if (input.method !== undefined) normalized.method = input.method;
  if (input.path !== undefined) normalized.path = input.path;
  if (input.expectedStatus !== undefined) normalized.expectedStatus = input.expectedStatus;
  if (input.maxLatencyMs !== undefined) normalized.maxLatencyMs = input.maxLatencyMs;
  if (input.active !== undefined) normalized.active = input.active;
  if (input.orderIndex !== undefined) normalized.orderIndex = input.orderIndex;
  if (input.headers !== undefined) normalized.headers = input.headers === null ? null : JSON.stringify(input.headers);
  if (input.body !== undefined) normalized.body = input.body === null ? null : typeof input.body === 'string' ? input.body : JSON.stringify(input.body);
  if (input.expectedSchema !== undefined) normalized.expectedSchema = input.expectedSchema === null ? null : JSON.stringify(input.expectedSchema);
  return normalized;
}
