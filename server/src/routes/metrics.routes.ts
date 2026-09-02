import { FastifyInstance } from 'fastify';
import { prisma } from '../shared/prisma.js';

export async function metricsRoutes(app: FastifyInstance) {
  app.get('/overview', async (request, reply) => {
    const [totalSuites, totalRuns, totalCases, runs] = await Promise.all([
      prisma.testSuite.count(),
      prisma.testRun.count(),
      prisma.testCase.count(),
      prisma.testRun.findMany({
        take: 30,
        orderBy: { createdAt: 'desc' },
        select: {
          status: true,
          successRate: true,
          p95LatencyMs: true,
          totalDurationMs: true,
          createdAt: true
        }
      })
    ]);

    let avgP95 = 0;
    let avgSuccessRate = 100;

    if (runs.length > 0) {
      const sumP95 = runs.reduce((acc, r) => acc + r.p95LatencyMs, 0);
      avgP95 = Math.round(sumP95 / runs.length);

      const sumSuccess = runs.reduce((acc, r) => acc + r.successRate, 0);
      avgSuccessRate = Number((sumSuccess / runs.length).toFixed(1));
    }

    return reply.send({
      metrics: {
        totalSuites,
        totalRuns,
        totalCases,
        avgSuccessRate: `${avgSuccessRate}%`,
        avgP95LatencyMs: `${avgP95}ms`,
        recentRuns: runs
      }
    });
  });
}
