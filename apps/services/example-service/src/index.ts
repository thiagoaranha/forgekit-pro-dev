import Fastify from 'fastify';
import { healthPlugin, logger, observabilityPlugin } from '@forgekit/shared-observability';
import { PrismaClient } from '@prisma/client';
import itemRoutes from './routes/items';

const prisma = new PrismaClient();
const SERVICE_NAME = 'example-service';

const buildService = async () => {
    const server = Fastify({ logger: false });

    server.register(observabilityPlugin, { serviceName: SERVICE_NAME });
    server.register(healthPlugin, {
        serviceName: SERVICE_NAME,
        readinessChecks: [
            {
                name: 'postgres',
                check: async () => {
                    await prisma.$queryRaw`SELECT 1`;
                },
            },
        ],
    });

    server.decorate('prisma', prisma);
    server.register(itemRoutes, { prefix: '/items' });

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
