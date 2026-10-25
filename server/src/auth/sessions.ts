import { createHash, randomBytes } from 'node:crypto';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../config/env.js';

export const SESSION_COOKIE = 'spectr_session';
export const SESSION_SECONDS = 7 * 24 * 60 * 60;
export const hashSessionToken = (token: string) => createHash('sha256').update(token).digest('hex');

export function newSession() {
  const token = randomBytes(32).toString('hex');
  return { token, tokenHash: hashSessionToken(token), expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000) };
}

export function sessionToken(request: FastifyRequest): string | null {
  const entry = request.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith(`${SESSION_COOKIE}=`));
  if (!entry) return null;
  const value = entry.slice(SESSION_COOKIE.length + 1);
  return /^[a-f\d]{64}$/.test(value) ? value : null;
}

const cookieSettings = () => `HttpOnly; Path=/api/v1; SameSite=${env.SESSION_SAME_SITE === 'none' ? 'None' : 'Lax'}${(env.SESSION_SECURE ?? env.NODE_ENV === 'production') ? '; Secure' : ''}`;

export function setSessionCookie(reply: FastifyReply, token: string) {
  reply.header('Set-Cookie', `${SESSION_COOKIE}=${token}; ${cookieSettings()}; Max-Age=${SESSION_SECONDS}`);
  reply.header('Cache-Control', 'no-store');
}

export function clearSessionCookie(reply: FastifyReply) {
  reply.header('Set-Cookie', `${SESSION_COOKIE}=; ${cookieSettings()}; Max-Age=0`);
  reply.header('Cache-Control', 'no-store');
}
