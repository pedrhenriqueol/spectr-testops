import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../shared/prisma.js';
import { executeTestSuite } from '../engine/runner.js';
import { AppError } from '../shared/errors/AppError.js';

export async function runsRoutes(app: FastifyInstance) {
  // Dispara a execução de uma suíte de testes
  app.post('/suites/:id/run', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id: suiteId } = paramsSchema.parse(request.params);

    const suite = await prisma.testSuite.findUnique({
      where: { id: suiteId }
    });

    if (!suite) {
      throw new AppError('Suíte de testes não encontrada.', 404);
    }

    const result = await executeTestSuite(suite.id, suite.workspaceId, 'MANUAL_DASHBOARD');
    return reply.status(200).send(result);
  });

  // Retorna detalhes e telemetria de uma execução
  app.get('/runs/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);

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
    const runs = await prisma.testRun.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        suite: { select: { id: true, name: true, baseUrl: true } }
      }
    });

    return reply.send({ runs });
  });
}
