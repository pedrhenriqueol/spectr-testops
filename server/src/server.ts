import fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { ZodError } from 'zod';

import { env } from './config/env.js';
import { AppError } from './shared/errors/AppError.js';
import { suitesRoutes } from './routes/suites.routes.js';
import { runsRoutes } from './routes/runs.routes.js';
import { chaosRoutes } from './routes/chaos.routes.js';
import { metricsRoutes } from './routes/metrics.routes.js';

const app = fastify({
  logger: env.NODE_ENV === 'development'
});

async function bootstrap() {
  await app.register(helmet, { contentSecurityPolicy: false });
  
  await app.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  });

  await app.register(rateLimit, {
    max: 500,
    timeWindow: '1 minute'
  });

  // Registro de rotas
  await app.register(suitesRoutes, { prefix: '/api/v1/suites' });
  await app.register(runsRoutes, { prefix: '/api/v1' });
  await app.register(chaosRoutes, { prefix: '/api/v1/chaos' });
  await app.register(metricsRoutes, { prefix: '/api/v1/metrics' });

  // Tratamento de erros centralizado
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        message: 'Erro de validação de payload.',
        errors: error.format()
      });
    }

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        message: error.message
      });
    }

    request.log.error(error);
    return reply.status(500).send({
      message: 'Erro interno no motor de testes Spectr.'
    });
  });

  app.get('/health', async () => ({
    status: 'online',
    service: 'Spectr TestOps Engine',
    timestamp: new Date().toISOString()
  }));

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    console.log(`🚀 Spectr TestOps Engine ativo em http://localhost:${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

bootstrap();
