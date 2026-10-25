import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireUser, listUserWorkspaces } from '../auth/access.js';
import { createOwnedWorkspace } from '../auth/workspaces.js';
import { prisma } from '../shared/prisma.js';

export async function workspacesRoutes(app: FastifyInstance) {
  app.get('/', async (request, reply) => {
    const user = await requireUser(request);
    return reply.send({ workspaces: await listUserWorkspaces(user.id) });
  });
  app.post('/', async (request, reply) => {
    const user = await requireUser(request);
    const { name } = z.object({ name: z.string().trim().min(2).max(100) }).parse(request.body);
    const workspace = await prisma.$transaction(transaction => createOwnedWorkspace(transaction, user.id, name));
    return reply.status(201).send({ workspace });
  });
}
