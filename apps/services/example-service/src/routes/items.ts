import { FastifyInstance } from 'fastify';
import {
  getCorrelationId,
  getTraceId,
  withDependencyTelemetry,
  withOperationTelemetry,
} from '@forgekit/shared-observability';
import { z } from 'zod';

const createItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export default async function (fastify: FastifyInstance) {
  const prisma = (fastify as any).prisma;

  fastify.get('/', async (request, reply) => {
    return withOperationTelemetry('items.list', { attributes: { method: request.method } }, async () => {
      const items = await withDependencyTelemetry('postgres', { operation: 'items.find_many' }, async () =>
        prisma.item.findMany()
      );

      return reply.send(items);
    });
  });

  fastify.post('/', async (request, reply) => {
    return withOperationTelemetry('items.create', { attributes: { method: request.method } }, async () => {
      const result = createItemSchema.safeParse(request.body);

      if (!result.success) {
        return reply.code(400).send({
          error: 'Validation Error',
          issues: result.error.issues,
          correlationId: getCorrelationId(),
          traceId: getTraceId(),
        });
      }

      const { name, description } = result.data;
      const item = await withDependencyTelemetry('postgres', { operation: 'items.create' }, async () =>
        prisma.item.create({
          data: { name, description },
        })
      );

      return reply.code(201).send(item);
    });
  });
}
