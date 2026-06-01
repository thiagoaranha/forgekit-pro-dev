import type { FastifyInstance } from 'fastify';
import { logger } from '@forgekit/shared-observability';
import type { InMemoryMetrics } from '../../infrastructure/metrics/in-memory-metrics';
import { resolveCorrelationId } from '../../infrastructure/observability/correlation-id';

const errorCodeByStatus = (statusCode: number): string => {
    if (statusCode >= 500) {
        return 'INTERNAL_ERROR';
    }

    if (statusCode === 401 || statusCode === 403) {
        return 'AUTH_ERROR';
    }

    if (statusCode === 404) {
        return 'NOT_FOUND';
    }

    return 'VALIDATION_ERROR';
};

export const registerErrorHandler = (server: FastifyInstance, metrics: InMemoryMetrics): void => {
    server.setErrorHandler((error, request, reply) => {
        metrics.observeError();

        const traceId = resolveCorrelationId(request);
        const statusCode = typeof error.statusCode === 'number' && error.statusCode >= 400 ? error.statusCode : 500;
        const code = errorCodeByStatus(statusCode);
        const message = statusCode >= 500 ? 'Unexpected internal error' : error.message;

        logger.error(
            {
                correlationId: traceId,
                statusCode,
                code,
                err: error,
                method: request.method,
                url: request.url,
            },
            'Request failed'
        );

        reply.status(statusCode).send({
            code,
            message,
            traceId,
        });
    });
};
