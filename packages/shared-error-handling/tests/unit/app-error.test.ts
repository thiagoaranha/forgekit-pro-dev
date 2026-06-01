import { describe, it, expect } from 'vitest';

import {
  AppError,
  validationError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  conflictError,
  dependencyError,
  internalError,
} from '../../src/app-error.js';

describe('AppError', () => {
  it('should create an error with all properties', () => {
    const error = new AppError('TEST_CODE', 418, 'test message', {
      details: { field: 'value' },
      isOperational: true,
    });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error.name).toBe('AppError');
    expect(error.code).toBe('TEST_CODE');
    expect(error.statusCode).toBe(418);
    expect(error.message).toBe('test message');
    expect(error.isOperational).toBe(true);
    expect(error.details).toEqual({ field: 'value' });
  });

  it('should default isOperational to true for 4xx status codes', () => {
    const error = new AppError('CLIENT', 400, 'bad request');

    expect(error.isOperational).toBe(true);
  });

  it('should default isOperational to false for 5xx status codes', () => {
    const error = new AppError('SERVER', 500, 'internal');

    expect(error.isOperational).toBe(false);
  });

  it('should allow explicit isOperational override', () => {
    const error = new AppError('CUSTOM', 500, 'critical', { isOperational: true });

    expect(error.isOperational).toBe(true);
  });
});

describe('Factory functions', () => {
  it('validationError should create 400 VALIDATION error', () => {
    const error = validationError('Name is required', { field: 'name' });

    expect(error.code).toBe('VALIDATION');
    expect(error.statusCode).toBe(400);
    expect(error.isOperational).toBe(true);
    expect(error.message).toBe('Name is required');
    expect(error.details).toEqual({ field: 'name' });
  });

  it('unauthorizedError should create 401 UNAUTHORIZED error with default message', () => {
    const error = unauthorizedError();

    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.statusCode).toBe(401);
    expect(error.isOperational).toBe(true);
    expect(error.message).toBe('Unauthorized');
  });

  it('unauthorizedError should accept custom message', () => {
    const error = unauthorizedError('Token expired');

    expect(error.message).toBe('Token expired');
  });

  it('forbiddenError should create 403 FORBIDDEN error', () => {
    const error = forbiddenError();

    expect(error.code).toBe('FORBIDDEN');
    expect(error.statusCode).toBe(403);
    expect(error.isOperational).toBe(true);
  });

  it('notFoundError should create 404 NOT_FOUND error', () => {
    const error = notFoundError();

    expect(error.code).toBe('NOT_FOUND');
    expect(error.statusCode).toBe(404);
    expect(error.isOperational).toBe(true);
  });

  it('conflictError should create 409 CONFLICT error', () => {
    const error = conflictError();

    expect(error.code).toBe('CONFLICT');
    expect(error.statusCode).toBe(409);
    expect(error.isOperational).toBe(true);
  });

  it('dependencyError should create 502 DEPENDENCY_FAILURE error', () => {
    const error = dependencyError('Database unavailable', { host: 'db:5432' });

    expect(error.code).toBe('DEPENDENCY_FAILURE');
    expect(error.statusCode).toBe(502);
    expect(error.isOperational).toBe(true);
    expect(error.details).toEqual({ host: 'db:5432' });
  });

  it('internalError should create 500 INTERNAL_ERROR error', () => {
    const error = internalError();

    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.statusCode).toBe(500);
    expect(error.isOperational).toBe(false);
    expect(error.message).toBe('Unexpected internal error');
  });
});
