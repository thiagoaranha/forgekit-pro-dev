import Fastify from 'fastify';
import { logger } from '@forgekit/shared-observability';
import { ReadinessService } from './application/health/readiness-service';
import { loadConfig } from './infrastructure/config/service-config';
import { InMemoryMetrics } from './infrastructure/metrics/in-memory-metrics';
import { resolveCorrelationId } from './infrastructure/observability/correlation-id';
import { registerErrorHandler } from './transport/http/error-handler';
import { registerRoutes } from './transport/http/register-routes';

const buildService = async () => {
    const server = Fastify({ logger: false });
    const metrics = new InMemoryMetrics();
    const readinessService = new ReadinessService([]);
    const requestStartTime = new Map<string, bigint>();

    registerErrorHandler(server, metrics);
    registerRoutes(server, readinessService, metrics);

    server.addHook('onRequest', async (request) => {
        const correlationId = resolveCorrelationId(request);
        requestStartTime.set(request.id, process.hrtime.bigint());
        logger.info({ correlationId, method: request.method, url: request.url }, 'Incoming request');
    });

    server.addHook('onResponse', async (request, reply) => {
        const startTime = requestStartTime.get(request.id);
        requestStartTime.delete(request.id);
        if (startTime !== undefined) {
            const durationMs = Number(process.hrtime.bigint() - startTime) / 1_000_000;
            metrics.observeRequest(durationMs, reply.statusCode);
        }
    });

    return server;
};

const start = async () => {
    try {
        const config = loadConfig();
        const server = await buildService();

        await server.listen({ port: config.PORT, host: config.HOST });
        logger.info({ port: config.PORT, host: config.HOST }, 'Service {{SERVICE_NAME}} started');

        const gracefulShutdown = async () => {
            logger.info('Shutdown signal received, closing service...');
            await server.close();
            process.exit(0);
        };

        process.on('SIGINT', gracefulShutdown);
        process.on('SIGTERM', gracefulShutdown);
    } catch (error) {
        logger.error({ err: error }, 'Failed to start service {{SERVICE_NAME}}');
        process.exit(1);
    }
};

start();
