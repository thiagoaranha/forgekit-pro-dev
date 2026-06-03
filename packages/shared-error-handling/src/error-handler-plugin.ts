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

/**
 * Sanitizes the `details` object before it is included in the HTTP response body.
 * Uses a JSON round-trip to drop non-serializable values (class instances, functions,
 * circular references) and prevents DB error objects with prototype methods from leaking
 * internal infrastructure information to API consumers (SEC-002).
 *
 * The full, unsanitized details are always preserved in the structured server-side log.
 */
const sanitizeDetailsForResponse = (details: unknown): unknown => {
  try {
    return JSON.parse(JSON.stringify(details));
  } catch {
    // If the object cannot be serialized at all (e.g., circular reference),
    // replace with a safe sentinel so the details field is still present
    // in the response but does not expose raw internal content.
    return { _sanitizationError: 'Details could not be serialized' };
  }
};

export const errorHandlerPlugin = fp(
  async (fastify: FastifyInstance): Promise<void> => {
    fastify.setErrorHandler((error: FastifyError, request, reply) => {
      // SEC-002: Pass the JSON round-trip sanitizer so that raw details objects
      // (e.g. database errors with connection strings) are stripped before the
      // response is sent to the client.
      const result = toErrorResponse(error, sanitizeDetailsForResponse);

      annotateSpanWithError(error);

      const logPayload = {
        err: error,
        // SEC-002: Log the complete, unsanitized details so operators have full
        // diagnostic information even though the response body is sanitized.
        details: error instanceof AppError ? error.details : undefined,
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
