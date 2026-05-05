export type AppErrorOptions = {
  details?: unknown;
  isOperational?: boolean;
};

export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly isOperational: boolean;
  readonly details?: unknown;

  constructor(code: string, statusCode: number, message: string, options: AppErrorOptions = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = options.isOperational ?? statusCode < 500;
    this.details = options.details;
  }
}

export const validationError = (message: string, details?: unknown): AppError =>
  new AppError('VALIDATION', 400, message, { details, isOperational: true });

export const unauthorizedError = (message = 'Unauthorized'): AppError =>
  new AppError('UNAUTHORIZED', 401, message, { isOperational: true });

export const forbiddenError = (message = 'Forbidden'): AppError =>
  new AppError('FORBIDDEN', 403, message, { isOperational: true });

export const notFoundError = (message = 'Not found'): AppError =>
  new AppError('NOT_FOUND', 404, message, { isOperational: true });

export const conflictError = (message = 'Conflict'): AppError =>
  new AppError('CONFLICT', 409, message, { isOperational: true });

export const dependencyError = (message: string, details?: unknown): AppError =>
  new AppError('DEPENDENCY_FAILURE', 502, message, { details, isOperational: true });

export const internalError = (message = 'Unexpected internal error'): AppError =>
  new AppError('INTERNAL_ERROR', 500, message, { isOperational: false });
