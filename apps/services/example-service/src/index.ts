import Fastify from 'fastify';
import { logger } from '@forgekit/shared-observability';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const buildService = async () => {
    const server = Fastify({ logger: false });

    // Custom logger hook to print requests with correlation ID
    server.addHook('onRequest', async (request, reply) => {
        const correlationId = request.headers['x-correlation-id'] || 'no-correlation';
        logger.info({ reqId: correlationId, method: request.method, url: request.url }, 'Incoming request');
    });

    server.register(require('./routes/health'));
    server.register(require('./routes/items'), { prefix: '/items' });
    
    // Inject prisma into the fastify instance
    server.decorate('prisma', prisma);

    return server;
};

const start = async () => {
    const server = await buildService();
    try {
        await prisma.$connect();
        logger.info('Connected to PostgreSQL successfully');

        await server.listen({ port: 3001, host: '0.0.0.0' });
        logger.info('Example Service is running on port 3001');

        // Graceful shutdown handling
        const gracefulShutdown = async () => {
            logger.info('Shutdown signal received, closing service...');
            await server.close();
            await prisma.$disconnect();
            process.exit(0);
        };

        process.on('SIGINT', gracefulShutdown);
        process.on('SIGTERM', gracefulShutdown);

    } catch (error) {
        logger.error({ err: error }, 'Failed to start example-service');
        process.exit(1);
    }
};

start();
