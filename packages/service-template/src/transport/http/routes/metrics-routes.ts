import type { FastifyInstance } from 'fastify';
import type { InMemoryMetrics } from '../../../infrastructure/metrics/in-memory-metrics';

export const registerMetricsRoutes = (server: FastifyInstance, metrics: InMemoryMetrics): void => {
    server.get('/metrics', async (_, reply) => {
        reply.header('content-type', 'text/plain; version=0.0.4');
        return metrics.renderPrometheus();
    });
};
