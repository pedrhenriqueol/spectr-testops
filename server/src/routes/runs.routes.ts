import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../shared/prisma.js';
import { executeTestSuite, executeSingleTestCase } from '../engine/runner.js';
import { AppError } from '../shared/errors/AppError.js';
import { executionBodySchema, idParamsSchema, workspaceQuerySchema } from './schemas.js';

export async function runsRoutes(app: FastifyInstance) {
  // Dispara a execução de um ÚNICO caso de teste (Single Request Runner)
  app.post('/cases/:id/run', async (request, reply) => {
    const { id: caseId } = idParamsSchema.parse(request.params);
    const body = executionBodySchema.parse(request.body);

    const result = await executeSingleTestCase(caseId, body?.baseUrl);
    return reply.status(200).send(result);
  });

  // Dispara a execução de uma suíte de testes
  app.post('/suites/:id/run', async (request, reply) => {
    const { id: suiteId } = idParamsSchema.parse(request.params);
    const body = executionBodySchema.parse(request.body);

    const suite = await prisma.testSuite.findUnique({
      where: { id: suiteId }
    });

    if (!suite) {
      throw new AppError('Suíte de testes não encontrada.', 404);
    }

    const result = await executeTestSuite(suite.id, suite.workspaceId, 'MANUAL_DASHBOARD', body?.baseUrl);
    return reply.status(200).send(result);
  });

  // Retorna detalhes e telemetria de uma execução
  app.get('/runs/:id', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);

    const run = await prisma.testRun.findUnique({
      where: { id },
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
    const { limit, workspaceId } = workspaceQuerySchema.extend({
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
