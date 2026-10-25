import { z } from 'zod';
import { caseExecutionOverridesSchema } from '../shared/test-case.js';

export const idParamsSchema = z.object({ id: z.string().uuid() });

export const httpUrlSchema = z.string().trim().url('Base URL inválida').refine(
  (value) => /^https?:\/\//i.test(value),
  'A URL deve usar HTTP ou HTTPS.'
);

export const workspaceQuerySchema = z.object({ workspaceId: z.string().uuid().optional() });

export const executionBodySchema = z.object({ baseUrl: httpUrlSchema.optional() }).optional();

export const singleExecutionBodySchema = z.object({
  baseUrl: httpUrlSchema.optional(),
  overrides: caseExecutionOverridesSchema.optional()
}).optional();
