import Fastify from 'fastify';
import { healthPlugin, logger, observabilityPlugin } from '@forgekit/shared-observability';
import { loadConfig } from './infrastructure/config/service-config';
import { InMemoryMetrics } from './infrastructure/metrics/in-memory-metrics';
import { registerErrorHandler } from './transport/http/error-handler';
import { registerRoutes } from './transport/http/register-routes';

const SERVICE_NAME = '{{SERVICE_NAME}}';

const buildService = async () => {
    const server = Fastify({ logger: false });
    const metrics = new InMemoryMetrics();

    server.register(observabilityPlugin, { serviceName: SERVICE_NAME });
    server.register(healthPlugin, { serviceName: SERVICE_NAME, readinessChecks: [] });
    registerErrorHandler(server, metrics);
    registerRoutes(server);

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
