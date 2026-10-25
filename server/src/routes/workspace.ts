import type { FastifyRequest } from 'fastify';
import { requireWorkspace } from '../auth/access.js';
import { AppError } from '../shared/errors/AppError.js';

// Workspace filters can narrow requests but cannot select a different tenant than the authenticated context.
export async function requireRouteWorkspace(request: FastifyRequest) {
  const context = await requireWorkspace(request);
  for (const input of [request.query, request.body]) {
    if (input && typeof input === 'object' && 'workspaceId' in input &&
      input.workspaceId !== undefined && input.workspaceId !== context.workspaceId) {
      throw new AppError('O workspace informado não corresponde ao workspace selecionado.', 403);
    }
  }
  return context;
}
