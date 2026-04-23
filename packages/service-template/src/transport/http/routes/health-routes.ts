import type { FastifyInstance } from 'fastify';
import type { ReadinessService } from '../../../application/health/readiness-service';

export const registerHealthRoutes = (server: FastifyInstance, readinessService: ReadinessService): void => {
    server.get('/health/live', async () => {
        return { status: 'OK' };
    });

    server.get('/health/ready', async (request, reply) => {
        const report = await readinessService.evaluate();

        if (!report.ready) {
            reply.status(503);
        }

        return {
            status: report.ready ? 'READY' : 'NOT_READY',
            dependencies: report.dependencies,
        };
    });
};
