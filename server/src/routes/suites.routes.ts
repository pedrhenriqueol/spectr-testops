import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../shared/prisma.js';
import { AppError } from '../shared/errors/AppError.js';
import { randomUUID } from 'node:crypto';
import { httpUrlSchema, idParamsSchema, workspaceQuerySchema } from './schemas.js';

export async function suitesRoutes(app: FastifyInstance) {
  // Lista todas as suítes
  app.get('/', async (request, reply) => {
    const { workspaceId } = workspaceQuerySchema.parse(request.query);
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
    const schema = z.object({
      workspaceId: z.string().uuid().optional(),
      name: z.string().trim().min(2),
      description: z.string().optional(),
      baseUrl: httpUrlSchema,
      headers: z.record(z.string()).optional()
    });

    const body = schema.parse(request.body);

    let workspace = body.workspaceId
      ? await prisma.workspace.findUnique({ where: { id: body.workspaceId } })
      : await prisma.workspace.findFirst();

    if (body.workspaceId && !workspace) {
      throw new AppError('Workspace não encontrado.', 404);
    }

    workspace ??= await prisma.workspace.upsert({
      where: { slug: 'principal' },
      update: {},
      create: {
        name: 'Principal Workspace',
        slug: 'principal',
        apiKey: `spk_${randomUUID()}`
      }
    });

    const suite = await prisma.testSuite.create({
      data: {
        workspaceId: workspace.id,
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
    const { id: suiteId } = idParamsSchema.parse(request.params);

    const schema = z.object({
      name: z.string().trim().min(2),
      method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
      path: z.string().trim().min(1).refine(
        (value) => !/^[a-z][a-z\d+.-]*:/i.test(value) || httpUrlSchema.safeParse(value).success,
        'O endpoint deve ser um caminho ou uma URL HTTP/HTTPS.'
      ),
      headers: z.record(z.string()).optional(),
      body: z.unknown().optional(),
      expectedStatus: z.number().int().min(100).max(599).default(200),
      maxLatencyMs: z.number().int().positive().max(300000).default(500),
      expectedSchema: z.union([z.record(z.unknown()), z.boolean()]).optional()
    });

    const body = schema.parse(request.body);

    if (!await prisma.testSuite.findUnique({ where: { id: suiteId }, select: { id: true } })) {
      throw new AppError('Suíte de testes não encontrada.', 404);
    }

    const count = await prisma.testCase.count({ where: { suiteId } });

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
        orderIndex: count
      }
    });

    return reply.status(201).send({ testCase });
  });

  // Atualiza suíte (nome, baseUrl, descrição)
  app.patch('/:id', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);

    const schema = z.object({
      name: z.string().trim().min(2).optional(),
      description: z.string().optional(),
      baseUrl: httpUrlSchema.optional()
    });

    const body = schema.parse(request.body);

    if (!await prisma.testSuite.findUnique({ where: { id }, select: { id: true } })) {
      throw new AppError('Suíte de testes não encontrada.', 404);
    }

    const suite = await prisma.testSuite.update({
      where: { id },
      data: body
    });

    return reply.send({ suite });
  });

  // Deleta suíte
  app.delete('/:id', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);

    const result = await prisma.testSuite.deleteMany({ where: { id } });
    if (result.count === 0) {
      throw new AppError('Suíte de testes não encontrada.', 404);
    }
    return reply.status(204).send();
  });
}
