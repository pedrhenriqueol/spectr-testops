import fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { env } from './config/env.js';
import { AppError } from './shared/errors/AppError.js';
import { suitesRoutes } from './routes/suites.routes.js';
import { runsRoutes } from './routes/runs.routes.js';
import { chaosRoutes } from './routes/chaos.routes.js';
import { metricsRoutes } from './routes/metrics.routes.js';

export function buildApp() {
  const app = fastify({ logger: env.NODE_ENV === 'development' });
  app.register(helmet, { contentSecurityPolicy: false });
  app.register(cors, {
    origin: env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  });
  app.register(rateLimit, { max: 500, timeWindow: '1 minute' });
  app.register(suitesRoutes, { prefix: '/api/v1/suites' });
  app.register(runsRoutes, { prefix: '/api/v1' });
  app.register(chaosRoutes, { prefix: '/api/v1/chaos' });
  app.register(metricsRoutes, { prefix: '/api/v1/metrics' });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({ message: 'Erro de validação de payload.', errors: error.format() });
    }
    if (error instanceof AppError) return reply.status(error.statusCode).send({ message: error.message });
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') return reply.status(404).send({ message: 'Registro não encontrado.' });
      if (error.code === 'P2003') return reply.status(409).send({ message: 'O registro relacionado não existe ou foi removido.' });
    }
    // Preserve Fastify's malformed JSON, payload size, method and rate-limit errors.
    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      return reply.status(error.statusCode).send({ message: error.message });
    }
    request.log.error(error);
    return reply.status(500).send({ message: 'Erro interno no motor de testes Spectr.' });
  });
  app.get('/health', async () => ({
    status: 'online', service: 'Spectr TestOps Engine', timestamp: new Date().toISOString()
  }));
  return app;
}
