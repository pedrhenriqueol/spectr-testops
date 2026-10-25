import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../shared/prisma.js';
import { executeTestSuite, executeSingleTestCase } from '../engine/runner.js';
import { AppError } from '../shared/errors/AppError.js';
import { executionBodySchema, idParamsSchema, singleExecutionBodySchema, workspaceQuerySchema } from './schemas.js';
import { requireRouteWorkspace } from './workspace.js';

export async function runsRoutes(app: FastifyInstance) {
  // Dispara a execução de um ÚNICO caso de teste (Single Request Runner)
  app.post('/cases/:id/run', async (request, reply) => {
    const { workspaceId } = await requireRouteWorkspace(request);
    const { id: caseId } = idParamsSchema.parse(request.params);
    const body = singleExecutionBodySchema.parse(request.body);

    if (!await prisma.testCase.findFirst({ where: { id: caseId, suite: { workspaceId } }, select: { id: true } })) {
      throw new AppError('Caso de teste não encontrado.', 404);
    }

    const result = await executeSingleTestCase(caseId, body?.baseUrl, body?.overrides);
    return reply.status(200).send(result);
  });

  // Dispara a execução de uma suíte de testes
  app.post('/suites/:id/run', async (request, reply) => {
    const { workspaceId } = await requireRouteWorkspace(request);
    const { id: suiteId } = idParamsSchema.parse(request.params);
    const body = executionBodySchema.parse(request.body);

    const suite = await prisma.testSuite.findFirst({
      where: { id: suiteId, workspaceId }
    });

    if (!suite) {
      throw new AppError('Suíte de testes não encontrada.', 404);
    }

    const result = await executeTestSuite(suite.id, suite.workspaceId, 'MANUAL_DASHBOARD', body?.baseUrl);
    return reply.status(200).send(result);
  });

  // Retorna detalhes e telemetria de uma execução
  app.get('/runs/:id', async (request, reply) => {
    const { workspaceId } = await requireRouteWorkspace(request);
    const { id } = idParamsSchema.parse(request.params);

    const run = await prisma.testRun.findFirst({
      where: { id, workspaceId },
      include: {
        suite: { select: { id: true, name: true, baseUrl: true } },
        assertions: { orderBy: { createdAt: 'asc' } }
      }
    });

    if (!run) {
      throw new AppError('Execução de teste não encontrada.', 404);
    }

    return reply.send({ run });
  });

  // Histórico de execuções
  app.get('/runs', async (request, reply) => {
    const { workspaceId } = await requireRouteWorkspace(request);
    const { limit } = workspaceQuerySchema.extend({
      limit: z.coerce.number().int().min(1).max(100).default(20)
    }).parse(request.query);
    const runs = await prisma.testRun.findMany({
      take: limit,
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      include: {
        suite: { select: { id: true, name: true, baseUrl: true } }
      }
    });

    return reply.send({ runs });
  });
}
