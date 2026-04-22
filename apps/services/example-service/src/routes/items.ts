import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const createItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export default async function (fastify: FastifyInstance) {
  const prisma = (fastify as any).prisma;

  fastify.get('/', async (request, reply) => {
    const items = await prisma.item.findMany();
    return items;
  });

  fastify.post('/', async (request, reply) => {
    const result = createItemSchema.safeParse(request.body);
    
    if (!result.success) {
      return reply.code(400).send({ error: 'Validation Error', issues: result.error.issues });
    }

    const { name, description } = result.data;
    const item = await prisma.item.create({
        data: { name, description }
    });

    return reply.code(201).send(item);
  });
}
