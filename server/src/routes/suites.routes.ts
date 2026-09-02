import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../shared/prisma.js';
import { AppError } from '../shared/errors/AppError.js';

export async function suitesRoutes(app: FastifyInstance) {
  // Lista todas as suítes
  app.get('/', async (request, reply) => {
    const suites = await prisma.testSuite.findMany({
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
      workspaceId: z.string().optional(),
      name: z.string().min(2),
      description: z.string().optional(),
      baseUrl: z.string().url('Base URL inválida'),
      headers: z.record(z.string()).optional()
    });

    const body = schema.parse(request.body);

    let workspace = await prisma.workspace.findFirst();
    if (!workspace) {
      workspace = await prisma.workspace.create({
        data: {
          name: 'Principal Workspace',
          slug: 'principal',
          apiKey: 'spk_live_demo2026'
        }
      });
    }

    const suite = await prisma.testSuite.create({
      data: {
        workspaceId: body.workspaceId || workspace.id,
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
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id: suiteId } = paramsSchema.parse(request.params);

    const schema = z.object({
      name: z.string().min(2),
      method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
      path: z.string(),
      headers: z.record(z.string()).optional(),
      body: z.any().optional(),
      expectedStatus: z.number().default(200),
      maxLatencyMs: z.number().default(500),
      expectedSchema: z.any().optional()
    });

    const body = schema.parse(request.body);

    const count = await prisma.testCase.count({ where: { suiteId } });

    const testCase = await prisma.testCase.create({
      data: {
        suiteId,
        name: body.name,
        method: body.method,
        path: body.path,
        headers: body.headers ? JSON.stringify(body.headers) : null,
        body: body.body ? (typeof body.body === 'string' ? body.body : JSON.stringify(body.body)) : null,
        expectedStatus: body.expectedStatus,
        maxLatencyMs: body.maxLatencyMs,
        expectedSchema: body.expectedSchema ? JSON.stringify(body.expectedSchema) : null,
        orderIndex: count
      }
    });

    return reply.status(201).send({ testCase });
  });

  // Deleta suíte
  app.delete('/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);

    await prisma.testSuite.delete({ where: { id } });
    return reply.status(204).send();
  });
}
