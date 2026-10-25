import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../shared/prisma.js';
import { AppError } from '../shared/errors/AppError.js';
import { httpUrlSchema, idParamsSchema, workspaceQuerySchema } from './schemas.js';
import { caseCreateSchema, casePatchSchema, normalizeCaseOverrides } from '../shared/test-case.js';
import { requireRouteWorkspace } from './workspace.js';

const caseParamsSchema = idParamsSchema.extend({ caseId: z.string().uuid() });

export async function suitesRoutes(app: FastifyInstance) {
  // Lista todas as suítes
  app.get('/', async (request, reply) => {
    const { workspaceId } = await requireRouteWorkspace(request);
    workspaceQuerySchema.parse(request.query);
    const suites = await prisma.testSuite.findMany({
      where: { workspaceId },
      include: {
        cases: { orderBy: { orderIndex: 'asc' } },
        runs: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            successRate: true,
            p95LatencyMs: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return reply.send({ suites });
  });

  // Cria nova suíte
  app.post('/', async (request, reply) => {
    const { workspaceId } = await requireRouteWorkspace(request);
    const schema = z.object({
      workspaceId: z.string().uuid().optional(),
      name: z.string().trim().min(2),
      description: z.string().optional(),
      baseUrl: httpUrlSchema,
      headers: z.record(z.string()).optional()
    });

    const body = schema.parse(request.body);

    const suite = await prisma.testSuite.create({
      data: {
        workspaceId,
        name: body.name,
        description: body.description,
        baseUrl: body.baseUrl,
        headers: body.headers ? JSON.stringify(body.headers) : null
      }
    });

    return reply.status(201).send({ suite });
  });

  // Adiciona caso de teste a uma suíte
  app.post('/:id/cases', async (request, reply) => {
    const { workspaceId } = await requireRouteWorkspace(request);
    const { id: suiteId } = idParamsSchema.parse(request.params);

    const body = caseCreateSchema.parse(request.body);

    if (!await prisma.testSuite.findFirst({ where: { id: suiteId, workspaceId }, select: { id: true } })) {
      throw new AppError('Suíte de testes não encontrada.', 404);
    }

    let orderIndex = body.orderIndex;
    if (orderIndex === undefined) {
      const lastCase = await prisma.testCase.findFirst({ where: { suiteId }, orderBy: { orderIndex: 'desc' }, select: { orderIndex: true } });
      orderIndex = (lastCase?.orderIndex ?? -1) + 1;
      if (orderIndex > 2147483647) throw new AppError('Informe uma ordem válida: o limite de ordenação desta suíte foi atingido.', 400);
    }

    const testCase = await prisma.testCase.create({
      data: {
        suiteId,
        name: body.name,
        method: body.method,
        path: body.path,
        headers: body.headers ? JSON.stringify(body.headers) : null,
        body: body.body === undefined ? null : (typeof body.body === 'string' ? body.body : JSON.stringify(body.body)),
        expectedStatus: body.expectedStatus,
        maxLatencyMs: body.maxLatencyMs,
        expectedSchema: body.expectedSchema === undefined ? null : JSON.stringify(body.expectedSchema),
        active: body.active,
        orderIndex
      }
    });

    return reply.status(201).send({ testCase });
  });

  app.patch('/:id/cases/:caseId', async (request, reply) => {
    const { workspaceId } = await requireRouteWorkspace(request);
    const { id: suiteId, caseId } = caseParamsSchema.parse(request.params);
    const body = casePatchSchema.parse(request.body);
    const testCase = await prisma.testCase.findFirst({ where: { id: caseId, suiteId, suite: { workspaceId } }, select: { id: true } });
    if (!testCase) throw new AppError('Caso de teste não encontrado nesta suíte.', 404);

    const updated = await prisma.testCase.update({
      where: { id: caseId, suiteId, suite: { workspaceId } },
      data: normalizeCaseOverrides(body)
    });
    return reply.send({ testCase: updated });
  });

  app.delete('/:id/cases/:caseId', async (request, reply) => {
    const { workspaceId } = await requireRouteWorkspace(request);
    const { id: suiteId, caseId } = caseParamsSchema.parse(request.params);
    const deleted = await prisma.testCase.deleteMany({ where: { id: caseId, suiteId, suite: { workspaceId } } });
    if (deleted.count === 0) throw new AppError('Caso de teste não encontrado nesta suíte.', 404);
    return reply.status(204).send();
  });

  // Atualiza suíte (nome, baseUrl, descrição)
  app.patch('/:id', async (request, reply) => {
    const { workspaceId } = await requireRouteWorkspace(request);
    const { id } = idParamsSchema.parse(request.params);

    const schema = z.object({
      name: z.string().trim().min(2).optional(),
      description: z.string().optional(),
      baseUrl: httpUrlSchema.optional()
    });

    const body = schema.parse(request.body);

    if (!await prisma.testSuite.findFirst({ where: { id, workspaceId }, select: { id: true } })) {
      throw new AppError('Suíte de testes não encontrada.', 404);
    }

    const suite = await prisma.testSuite.update({
      where: { id, workspaceId },
      data: body
    });

    return reply.send({ suite });
  });

  // Deleta suíte
  app.delete('/:id', async (request, reply) => {
    const { workspaceId } = await requireRouteWorkspace(request);
    const { id } = idParamsSchema.parse(request.params);

    const result = await prisma.testSuite.deleteMany({ where: { id, workspaceId } });
    if (result.count === 0) {
      throw new AppError('Suíte de testes não encontrada.', 404);
    }
    return reply.status(204).send();
  });
}
