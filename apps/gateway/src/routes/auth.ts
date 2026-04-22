import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance) {
  fastify.get('/dev-token', async (request, reply) => {
    if (process.env.NODE_ENV === 'production') {
        return reply.code(404).send({ error: 'Not Found' });
    }

    const payload = {
        sub: 'dev-user-001',
        role: 'admin',
        name: 'Developer'
    };

    const token = fastify.jwt.sign(payload);
    return { token };
  });
}
