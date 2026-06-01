import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AppError, validationError, internalError } from '../../src/app-error.js';
import { toErrorResponse } from '../../src/error-response.js';

vi.mock('@forgekit/shared-observability', () => ({
  getCorrelationId: () => 'test-correlation-id',
  getTraceId: () => 'test-trace-id',
}));

describe('toErrorResponse', () => {
  it('should convert AppError to ErrorResponse with correct fields', () => {
    const error = validationError('Name is required', { field: 'name' });
    const result = toErrorResponse(error);

    expect(result.statusCode).toBe(400);
    expect(result.isOperational).toBe(true);
    expect(result.body).toEqual({
      code: 'VALIDATION',
      message: 'Name is required',
      correlationId: 'test-correlation-id',
      traceId: 'test-trace-id',
      details: { field: 'name' },
    });
  });

  it('should include details only for operational errors', () => {
    const operationalError = validationError('bad input', { field: 'email' });
    const operationalResult = toErrorResponse(operationalError);
    expect(operationalResult.body.details).toEqual({ field: 'email' });

    const internalErr = internalError('crash');
    // internalError has isOperational = false, so details should not be exposed
    const internalResult = toErrorResponse(internalErr);
    expect(internalResult.body.details).toBeUndefined();
  });

  it('should sanitize non-AppError to INTERNAL_ERROR', () => {
    const error = new Error('Something secret broke');
    const result = toErrorResponse(error);

    expect(result.statusCode).toBe(500);
    expect(result.isOperational).toBe(false);
    expect(result.body.code).toBe('INTERNAL_ERROR');
    expect(result.body.message).toBe('Unexpected internal error');
    expect(result.body.correlationId).toBe('test-correlation-id');
    expect(result.body.traceId).toBe('test-trace-id');
  });

  it('should sanitize non-Error values to INTERNAL_ERROR', () => {
    const result = toErrorResponse('string error');

    expect(result.statusCode).toBe(500);
    expect(result.body.code).toBe('INTERNAL_ERROR');
    expect(result.body.message).toBe('Unexpected internal error');
  });

  it('should sanitize null/undefined to INTERNAL_ERROR', () => {
    const result = toErrorResponse(null);

    expect(result.statusCode).toBe(500);
    expect(result.body.code).toBe('INTERNAL_ERROR');
  });

  it('should not include details for AppError with details when not operational', () => {
    const error = new AppError('INTERNAL_ERROR', 500, 'crash', {
      details: { secret: 'data' },
      isOperational: false,
    });
    const result = toErrorResponse(error);

    expect(result.body.details).toBeUndefined();
  });
});
