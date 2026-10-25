import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../shared/prisma.js';
import { AppError } from '../shared/errors/AppError.js';
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from '../auth/passwords.js';
import { clearSessionCookie, hashSessionToken, newSession, sessionToken, setSessionCookie } from '../auth/sessions.js';
import { listUserWorkspaces, requireUser, verifyRequestOrigin } from '../auth/access.js';
import { createOwnedWorkspace } from '../auth/workspaces.js';

const emailSchema = z.string().trim().email().max(254).transform(value => value.toLowerCase());
const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: emailSchema,
  password: z.string().min(12).max(128),
  workspaceName: z.string().trim().min(2).max(100).optional()
});
const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128) });
const rate = { rateLimit: { max: 10, timeWindow: '1 minute' } };

export async function authRoutes(app: FastifyInstance) {
  app.addHook('onRequest', async (request, reply) => {
    verifyRequestOrigin(request);
    reply.header('Cache-Control', 'no-store');
  });

  app.post('/register', { config: rate }, async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const passwordHash = await hashPassword(body.password);
    const session = newSession();
    try {
      const result = await prisma.$transaction(async transaction => {
        const user = await transaction.user.create({
          data: { name: body.name, email: body.email, passwordHash },
          select: { id: true, name: true, email: true }
        });
        const workspace = await createOwnedWorkspace(transaction, user.id, body.workspaceName || `${body.name.slice(0, 75)} — Workspace`);
        await transaction.session.create({ data: { userId: user.id, tokenHash: session.tokenHash, expiresAt: session.expiresAt } });
        return { user, workspaces: [workspace], currentWorkspaceId: workspace.id };
      });
      setSessionCookie(reply, session.token);
      return reply.status(201).send(result);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError('Este e-mail já está cadastrado.', 409);
      }
      throw error;
    }
  });

  app.post('/login', { config: rate }, async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const account = await prisma.user.findUnique({ where: { email: body.email } });
    const valid = await verifyPassword(body.password, account?.passwordHash || DUMMY_PASSWORD_HASH);
    if (!valid || !account) throw new AppError('E-mail ou senha inválidos.', 401);
    const session = newSession();
    await prisma.$transaction([
      prisma.session.deleteMany({ where: { userId: account.id, expiresAt: { lte: new Date() } } }),
      prisma.session.create({ data: { userId: account.id, tokenHash: session.tokenHash, expiresAt: session.expiresAt } })
    ]);
    const user = { id: account.id, name: account.name, email: account.email };
    const workspaces = await listUserWorkspaces(user.id);
    setSessionCookie(reply, session.token);
    return reply.send({ user, workspaces, currentWorkspaceId: workspaces[0]?.id ?? null });
  });

  app.get('/me', async (request, reply) => {
    const user = await requireUser(request);
    const workspaces = await listUserWorkspaces(user.id);
    const selected = request.headers['x-workspace-id'];
    const currentWorkspaceId = typeof selected === 'string' && workspaces.some(workspace => workspace.id === selected) ? selected : workspaces[0]?.id ?? null;
    return reply.send({ user, workspaces, currentWorkspaceId });
  });

  app.post('/logout', async (request, reply) => {
    const token = sessionToken(request);
    if (token) await prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
    clearSessionCookie(reply);
    return reply.status(204).send();
  });
}
