import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance) {
  fastify.get('/health/live', async () => {
    return { status: 'OK' };
  });

  fastify.get('/health/ready', async () => {
    // In a real scenario, check dependencies like DB/Redis if the gateway had any
    return { status: 'OK' };
  });
}
