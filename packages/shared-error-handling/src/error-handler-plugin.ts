import { getTraceId, logger } from '@forgekit/shared-observability';
import type { FastifyError, FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

import { AppError } from './app-error';
import { toErrorResponse } from './error-response';

export const errorHandlerPlugin = fp(
  async (fastify: FastifyInstance): Promise<void> => {
    fastify.setErrorHandler((error: FastifyError, request, reply) => {
      const result = toErrorResponse(error);

      const logPayload = {
        err: error,
        code: result.body.code,
        statusCode: result.statusCode,
        method: request.method,
        route: request.routeOptions.url,
        traceId: getTraceId(),
      };

      if (result.isOperational) {
        logger.warn(logPayload, 'Request failed with operational error');
      } else {
        logger.error(logPayload, 'Request failed with unexpected error');
      }

      reply.status(result.statusCode).send(result.body);
    });
  },
  { name: 'forgekit-error-handler' }
);

export const isAppError = (error: unknown): error is AppError => error instanceof AppError;
