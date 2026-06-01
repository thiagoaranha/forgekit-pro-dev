import { describe, it, expect, vi } from 'vitest';
import Fastify from 'fastify';

import { errorHandlerPlugin } from '../../src/error-handler-plugin.js';
import { validationError, notFoundError, internalError } from '../../src/app-error.js';

vi.mock('@forgekit/shared-observability', () => ({
  getCorrelationId: () => 'test-correlation-id',
  getTraceId: () => 'test-trace-id',
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@opentelemetry/api', () => {
  const mockSpan = {
    recordException: vi.fn(),
    setStatus: vi.fn(),
  };

  return {
    trace: {
      getActiveSpan: vi.fn(() => mockSpan),
    },
    SpanStatusCode: {
      ERROR: 2,
    },
  };
});

const buildApp = async () => {
  const app = Fastify();
  await app.register(errorHandlerPlugin);

  app.get('/validation-error', () => {
    throw validationError('Name is required', { field: 'name' });
  });

  app.get('/not-found-error', () => {
    throw notFoundError('Item not found');
  });

  app.get('/internal-error', () => {
    throw internalError();
  });

  app.get('/raw-error', () => {
    throw new Error('Something secret broke');
  });

  return app;
};

describe('errorHandlerPlugin', () => {
  it('should return 400 with VALIDATION code for validation errors', async () => {
    const app = await buildApp();
    const response = await app.inject({ method: 'GET', url: '/validation-error' });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.code).toBe('VALIDATION');
    expect(body.message).toBe('Name is required');
    expect(body.correlationId).toBe('test-correlation-id');
    expect(body.traceId).toBe('test-trace-id');
    expect(body.details).toEqual({ field: 'name' });
  });

  it('should return 404 with NOT_FOUND code', async () => {
    const app = await buildApp();
    const response = await app.inject({ method: 'GET', url: '/not-found-error' });

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body.code).toBe('NOT_FOUND');
    expect(body.message).toBe('Item not found');
  });

  it('should return 500 with sanitized message for unexpected errors', async () => {
    const app = await buildApp();
    const response = await app.inject({ method: 'GET', url: '/raw-error' });

    expect(response.statusCode).toBe(500);
    const body = response.json();
    expect(body.code).toBe('INTERNAL_ERROR');
    expect(body.message).toBe('Unexpected internal error');
    expect(body.details).toBeUndefined();
  });

  it('should not include details for internal errors', async () => {
    const app = await buildApp();
    const response = await app.inject({ method: 'GET', url: '/internal-error' });

    expect(response.statusCode).toBe(500);
    const body = response.json();
    expect(body.details).toBeUndefined();
  });

  it('should log operational errors with warn level', async () => {
    const { logger } = await import('@forgekit/shared-observability');
    const app = await buildApp();
    await app.inject({ method: 'GET', url: '/validation-error' });

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'VALIDATION', statusCode: 400 }),
      'Request failed with operational error'
    );
  });

  it('should log unexpected errors with error level', async () => {
    const { logger } = await import('@forgekit/shared-observability');
    const app = await buildApp();
    await app.inject({ method: 'GET', url: '/raw-error' });

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'INTERNAL_ERROR', statusCode: 500 }),
      'Request failed with unexpected error'
    );
  });
});
