import type { FastifyInstance } from 'fastify';
import { getCorrelationId, logger, withOperationTelemetry } from '@forgekit/shared-observability';

// SCAFFOLD EXAMPLE — Replace with domain-specific routes.
// This route demonstrates the full synchronous request path through the API Gateway.
// It is safe to delete once you have real domain routes in place.
export const registerExampleRoutes = (server: FastifyInstance): void => {
    server.get('/items', async (request) =>
        withOperationTelemetry('items.list', { attributes: { method: request.method } }, async () => {
            const correlationId = getCorrelationId();

            logger.info({ path: '/items' }, 'Example GET /items route called');

            // Replace this static response with actual application logic.
            return {
                items: [
                    { id: '1', name: 'Example Item A' },
                    { id: '2', name: 'Example Item B' },
                ],
                meta: {
                    correlationId,
                    service: '{{SERVICE_NAME}}',
                },
            };
        })
    );
};
