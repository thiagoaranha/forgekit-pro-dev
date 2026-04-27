import type { FastifyInstance } from 'fastify';
import type { ReadinessService } from '../../application/health/readiness-service';
import type { InMemoryMetrics } from '../../infrastructure/metrics/in-memory-metrics';
import { registerHealthRoutes } from './routes/health-routes';
import { registerMetricsRoutes } from './routes/metrics-routes';
// SCAFFOLD EXAMPLE — Remove this import once you add domain-specific routes.
import { registerExampleRoutes } from './routes/example-routes';

export const registerRoutes = (
    server: FastifyInstance,
    readinessService: ReadinessService,
    metrics: InMemoryMetrics
): void => {
    registerHealthRoutes(server, readinessService);
    registerMetricsRoutes(server, metrics);
    // SCAFFOLD EXAMPLE — Remove this registration once you add domain-specific routes.
    registerExampleRoutes(server);
};
