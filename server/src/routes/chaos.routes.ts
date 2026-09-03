import { FastifyInstance } from 'fastify';

export async function chaosRoutes(app: FastifyInstance) {
  // Simula latência/atraso artificial
  app.all('/simulate-delay', async (request, reply) => {
    const query = request.query as any;
    const body = request.body as any;
    const delayMs = Number(query?.delay || body?.delay || 2000);

    // Delay assíncrono blindado contra memory leaks com liberação imediata em caso de cancelamento do socket
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        resolve();
      }, Math.min(Math.max(0, delayMs), 30000));

      request.raw.once('close', () => {
        clearTimeout(timer);
        resolve();
      });
    });

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
    const query = request.query as any;
    const code = Number(query?.code || 503);

    return reply.status(code).send({
      simulated: true,
      type: 'INJECTED_ERROR',
      statusCode: code,
      error: code === 503 ? 'Service Unavailable' : 'Internal Server Error',
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
