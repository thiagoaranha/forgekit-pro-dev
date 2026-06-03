import { getCorrelationId, getTraceId } from '@forgekit/shared-observability';

import { AppError } from './app-error.js';

export type ErrorResponse = {
  code: string;
  message: string;
  correlationId: string;
  traceId: string | undefined;
  details?: unknown;
};

export type ErrorResult = {
  statusCode: number;
  isOperational: boolean;
  body: ErrorResponse;
};

/**
 * Converts any Error or AppError into a standardized ErrorResult.
 *
 * @param error - The error to convert.
 * @param sanitizeDetails - Optional function applied to `AppError.details` before
 *   attaching it to the response body. When provided (e.g., by errorHandlerPlugin),
 *   it prevents internal infrastructure details from leaking to HTTP clients (SEC-002).
 *   When absent, `details` is included as-is for backward compatibility with direct callers
 *   that control their own details objects.
 */
export const toErrorResponse = (
  error: unknown,
  sanitizeDetails?: (details: unknown) => unknown
): ErrorResult => {
  const correlationId = getCorrelationId();
  const traceId = getTraceId();

  if (error instanceof AppError) {
    const body: ErrorResponse = {
      code: error.code,
      message: error.message,
      correlationId,
      traceId,
    };

    if (error.isOperational && error.details !== undefined) {
      body.details = sanitizeDetails ? sanitizeDetails(error.details) : error.details;
    }

    return {
      statusCode: error.statusCode,
      isOperational: error.isOperational,
      body,
    };
  }

  return {
    statusCode: 500,
    isOperational: false,
    body: {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected internal error',
      correlationId,
      traceId,
    },
  };
};
