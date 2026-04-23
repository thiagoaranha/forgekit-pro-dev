import type { FastifyRequest } from 'fastify';

export const resolveCorrelationId = (request: FastifyRequest): string => {
    const headerValue = request.headers['x-correlation-id'];

    if (Array.isArray(headerValue)) {
        if (headerValue[0] && headerValue[0].trim() !== '') {
            return headerValue[0];
        }
        return request.id;
    }

    if (typeof headerValue === 'string' && headerValue.trim() !== '') {
        return headerValue;
    }

    return request.id;
};
