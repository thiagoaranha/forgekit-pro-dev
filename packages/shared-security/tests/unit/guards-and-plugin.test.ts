import { describe, it, expect, vi } from 'vitest';
import Fastify from 'fastify';

import { identityPlugin } from '../../src/identity-plugin.js';
import { requireIdentity, requireRole } from '../../src/guards.js';

vi.mock('@forgekit/shared-error-handling', () => ({
  unauthorizedError: (message = 'Unauthorized') => {
    const error = new Error(message);
    (error as Record<string, unknown>).statusCode = 401;
    return error;
  },
  forbiddenError: (message = 'Forbidden') => {
    const error = new Error(message);
    (error as Record<string, unknown>).statusCode = 403;
    return error;
  },
}));

const buildApp = async () => {
  const app = Fastify();
  await app.register(identityPlugin);

  app.get('/public', (request) => ({ identity: request.identity }));

  app.get('/protected', { preHandler: [requireIdentity] }, (request) => ({
    userId: request.identity.userId,
  }));

  app.get('/admin-only', { preHandler: [requireRole('admin')] }, (request) => ({
    role: request.identity.role,
  }));

  app.get('/multi-role', { preHandler: [requireRole('admin', 'editor')] }, (request) => ({
    role: request.identity.role,
  }));

  return app;
};

describe('identityPlugin', () => {
  it('should extract identity from request headers', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/public',
      headers: {
        'x-forgekit-user-id': 'user-123',
        'x-forgekit-role': 'admin',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.identity.userId).toBe('user-123');
    expect(body.identity.role).toBe('admin');
  });

  it('should set undefined identity when headers are missing', async () => {
    const app = await buildApp();
    const response = await app.inject({ method: 'GET', url: '/public' });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.identity.userId).toBeUndefined();
    expect(body.identity.role).toBeUndefined();
  });
});

describe('requireIdentity', () => {
  it('should allow authenticated requests', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { 'x-forgekit-user-id': 'user-123' },
    });

    expect(response.statusCode).toBe(200);
  });

  it('should return 401 for unauthenticated requests', async () => {
    const app = await buildApp();
    const response = await app.inject({ method: 'GET', url: '/protected' });

    expect(response.statusCode).toBe(401);
  });
});

describe('requireRole', () => {
  it('should allow requests with matching role', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/admin-only',
      headers: {
        'x-forgekit-user-id': 'user-123',
        'x-forgekit-role': 'admin',
      },
    });

    expect(response.statusCode).toBe(200);
  });

  it('should return 401 when userId is absent (unauthenticated)', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/admin-only',
      headers: { 'x-forgekit-role': 'admin' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('should return 403 when role does not match', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/admin-only',
      headers: {
        'x-forgekit-user-id': 'user-123',
        'x-forgekit-role': 'viewer',
      },
    });

    expect(response.statusCode).toBe(403);
  });

  it('should return 403 when role header is missing', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/admin-only',
      headers: { 'x-forgekit-user-id': 'user-123' },
    });

    expect(response.statusCode).toBe(403);
  });

  it('should allow any of multiple specified roles', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/multi-role',
      headers: {
        'x-forgekit-user-id': 'user-123',
        'x-forgekit-role': 'editor',
      },
    });

    expect(response.statusCode).toBe(200);
  });
});
