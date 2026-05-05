import { getCorrelationId, getTraceId } from '@forgekit/shared-observability';

import { AppError } from './app-error';

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

export const toErrorResponse = (error: unknown): ErrorResult => {
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
      body.details = error.details;
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
