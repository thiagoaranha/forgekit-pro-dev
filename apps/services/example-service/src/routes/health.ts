import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance) {
  fastify.get('/health/live', async () => {
    return { status: 'OK' };
  });

  fastify.get('/health/ready', async () => {
    try {
        // Query the database to ensure we are truly ready
        await (fastify as any).prisma.$queryRaw`SELECT 1`;
        return { status: 'OK' };
    } catch (error) {
        return fastify.code(503).send({ status: 'ERROR', details: 'Database unavailable' });
    }
  });
}
