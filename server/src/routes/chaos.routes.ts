import { FastifyInstance } from 'fastify';
import { STATUS_CODES } from 'node:http';
import { z } from 'zod';

const numericInput = z.union([z.number(), z.string().trim().min(1)]);
const delaySchema = z.object({ delay: numericInput.pipe(z.coerce.number().int().min(0).max(30000)).optional() });
const errorSchema = z.object({ code: numericInput.pipe(z.coerce.number().int().min(400).max(599)).default(503) });

export async function chaosRoutes(app: FastifyInstance) {
  // Simula latência/atraso artificial
  app.all('/simulate-delay', async (request, reply) => {
    const query = delaySchema.parse(request.query);
    const body = delaySchema.parse(request.body ?? {});
    const delayMs = query.delay ?? body.delay ?? 2000;

    // Observe a conexão de resposta: o fechamento do request também ocorre ao terminar de ler um POST.
    await new Promise<void>((resolve) => {
      const finish = () => {
        clearTimeout(timer);
        reply.raw.off('close', finish);
        resolve();
      };
      const timer = setTimeout(finish, delayMs);
      reply.raw.once('close', finish);

      if (reply.raw.destroyed) finish();
    });

    if (reply.raw.destroyed) return;

    return reply.send({
      simulated: true,
      type: 'LATENCY_DELAY',
      delayInjectedMs: delayMs,
      timestamp: new Date().toISOString(),
      message: `Resposta atrasada propositalmente em ${delayMs}ms para testes de resiliência e timeout.`
    });
  });

  // Simula erro de indisponibilidade
  app.all('/simulate-error', async (request, reply) => {
    const { code } = errorSchema.parse(request.query);

    return reply.status(code).send({
      simulated: true,
      type: 'INJECTED_ERROR',
      statusCode: code,
      error: STATUS_CODES[code] ?? 'Injected Error',
      message: 'Falha simulada injetada pelo motor de Chaos Engineering do Spectr.'
    });
  });

  // Simula serviço intermitente (50% de sucesso)
  app.all('/simulate-flaky', async (request, reply) => {
    const isSuccess = Math.random() > 0.5;

    if (!isSuccess) {
      return reply.status(500).send({
        simulated: true,
        type: 'FLAKY_FAILURE',
        message: 'Falha intermitente simulada (500 Internal Error).'
      });
    }

    return reply.status(200).send({
      simulated: true,
      type: 'FLAKY_SUCCESS',
      message: 'Requisição processada com sucesso.'
    });
  });

  // Endpoint de echo para validação de contratos e schemas
  app.all('/echo', async (request, reply) => {
    return reply.status(200).send({
      method: request.method,
      url: request.url,
      headers: request.headers,
      body: request.body,
      timestamp: new Date().toISOString()
    });
  });
}
