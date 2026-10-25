import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../shared/prisma.js';
import { AppError } from '../shared/errors/AppError.js';
import { env } from '../config/env.js';
import { hashSessionToken, sessionToken } from './sessions.js';

export interface AuthenticatedUser { id: string; name: string; email: string }
export interface WorkspaceScope { workspaceId: string; userId: string; role: string }
const users = new WeakMap<FastifyRequest, Promise<AuthenticatedUser>>();
const scopes = new WeakMap<FastifyRequest, Promise<WorkspaceScope>>();

export function verifyRequestOrigin(request: FastifyRequest) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
  const origin = request.headers.origin;
  if (!origin && env.SESSION_SAME_SITE === 'none') throw new AppError('O cabeçalho Origin é obrigatório para esta operação.', 403);
  if (origin && origin !== new URL(env.CLIENT_URL).origin) throw new AppError('Origem da requisição não permitida.', 403);
  if (!origin && request.headers['sec-fetch-site'] === 'cross-site') throw new AppError('Origem da requisição não permitida.', 403);
}

export function requireUser(request: FastifyRequest): Promise<AuthenticatedUser> {
  let user = users.get(request);
  if (!user) {
    user = (async () => {
      verifyRequestOrigin(request);
      const token = sessionToken(request);
      if (!token) throw new AppError('Faça login para continuar.', 401);
      const session = await prisma.session.findUnique({
        where: { tokenHash: hashSessionToken(token) },
        select: { expiresAt: true, user: { select: { id: true, name: true, email: true } } }
      });
      if (!session || session.expiresAt.getTime() <= Date.now()) throw new AppError('Sua sessão expirou. Faça login novamente.', 401);
      return session.user;
    })();
    users.set(request, user);
  }
  return user;
}

export function requireWorkspace(request: FastifyRequest): Promise<WorkspaceScope> {
  let scope = scopes.get(request);
  if (!scope) {
    scope = (async () => {
      const user = await requireUser(request);
      const header = request.headers['x-workspace-id'];
      const workspaceId = header === undefined ? undefined : z.string().uuid().parse(header);
      const membership = workspaceId
        ? await prisma.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: user.id, workspaceId } } })
        : await prisma.workspaceMember.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'asc' } });
      if (!membership) throw new AppError('Você não tem acesso a este workspace.', 403);
      return { workspaceId: membership.workspaceId, userId: user.id, role: membership.role };
    })();
    scopes.set(request, scope);
  }
  return scope;
}

export async function listUserWorkspaces(userId: string) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId }, orderBy: { createdAt: 'asc' },
    select: { role: true, workspace: { select: { id: true, name: true, slug: true } } }
  });
  return memberships.map(({ workspace, role }) => ({ ...workspace, role }));
}
