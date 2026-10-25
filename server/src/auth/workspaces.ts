import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';

export async function createOwnedWorkspace(transaction: Prisma.TransactionClient, userId: string, name: string) {
  const prefix = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z\d]+/g, '-').replace(/^-|-$/g, '').slice(0, 35) || 'workspace';
  const workspace = await transaction.workspace.create({
    data: { name, slug: `${prefix}-${randomUUID()}`, apiKey: `spk_${randomUUID()}`, members: { create: { userId, role: 'OWNER' } } },
    select: { id: true, name: true, slug: true }
  });
  return { ...workspace, role: 'OWNER' };
}
