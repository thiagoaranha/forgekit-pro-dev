import { SpanStatusCode, trace } from '@opentelemetry/api';
import { logger } from '@forgekit/shared-observability';
import type { FastifyError, FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

import { AppError } from './app-error.js';
import { toErrorResponse } from './error-response.js';

const annotateSpanWithError = (error: unknown): void => {
  const span = trace.getActiveSpan();

  if (!span) {
    return;
  }

  span.recordException(error instanceof Error ? error : new Error(String(error)));
  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: error instanceof Error ? error.message : String(error),
  });
};

export const errorHandlerPlugin = fp(
  async (fastify: FastifyInstance): Promise<void> => {
    fastify.setErrorHandler((error: FastifyError, request, reply) => {
      const result = toErrorResponse(error);

      annotateSpanWithError(error);

      const logPayload = {
        err: error,
        code: result.body.code,
        statusCode: result.statusCode,
        method: request.method,
        route: request.routeOptions.url,
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
