import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance) {
  fastify.get('/health/live', async () => {
    return { status: 'OK' };
  });

  fastify.get('/health/ready', async () => {
    return { status: 'OK' };
  });
}
