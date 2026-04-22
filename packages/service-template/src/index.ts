import Fastify from 'fastify';
import { logger } from '@forgekit/shared-observability';

const buildService = async () => {
    const server = Fastify({ logger: false });

    server.addHook('onRequest', async (request, reply) => {
        const correlationId = request.headers['x-correlation-id'] || 'no-correlation';
        logger.info({ reqId: correlationId, method: request.method, url: request.url }, 'Incoming request');
    });

    server.register(require('./routes/health'));

    return server;
};

const start = async () => {
    const server = await buildService();
    try {
        const port = Number(process.env.PORT) || 3000;
        await server.listen({ port, host: '0.0.0.0' });
        logger.info(`Service {{SERVICE_NAME}} is running on port ${port}`);

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
