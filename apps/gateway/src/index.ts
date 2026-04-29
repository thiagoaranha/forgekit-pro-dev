import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import httpProxy from '@fastify/http-proxy';
import { logger, getCorrelationId } from '@forgekit/shared-observability';
import authRoutes from './routes/auth';
import healthRoutes from './routes/health';

const buildGateway = async () => {
  const server = Fastify({ logger: false }); // We use our own logger instance inside handlers or inject it

  // Register JWT for Dev Tokens
  server.register(jwt, {
    secret: process.env.JWT_SECRET || 'forgekit-local-dev-secret'
  });

  // Health endpoint
  server.register(healthRoutes);

  // Auth endpoint for dev token generation
  server.register(authRoutes, { prefix: '/auth' });

  // Proxy to example-service
  // Notice we use a preHandler to verify the JWT and inject it before proxying
  server.register(httpProxy, {
    upstream: process.env.EXAMPLE_SERVICE_URL || 'http://localhost:3001',
    prefix: '/api/example',
    preHandler: async (request, reply) => {
      if (request.url.includes('/health/')) return;
      try {
        await request.jwtVerify();
        const user = request.user as any;
        request.headers['x-forgekit-user-id'] = user.sub;
        request.headers['x-forgekit-role'] = user.role;
        request.headers['x-correlation-id'] = request.headers['x-correlation-id'] || getCorrelationId();
      } catch (err) {
        reply.code(401).send({ error: 'Unauthorized', message: 'Valid dev token is required' });
      }
    }
  });

  // SCAFFOLD EXAMPLE — Proxy for test-service.
  // Requests to /api/test-service/* are forwarded to the test-service service.
  server.register(httpProxy, {
    upstream: process.env.TEST_SERVICE_SERVICE_URL || 'http://localhost:3002',
    prefix: '/api/test-service',
    preHandler: async (request, reply) => {
      if (request.url.includes('/health/')) return;
      try {
        await request.jwtVerify();
        const user = request.user as any;
        request.headers['x-forgekit-user-id'] = user.sub;
        request.headers['x-forgekit-role'] = user.role;
        request.headers['x-correlation-id'] = request.headers['x-correlation-id'] || getCorrelationId();
      } catch (err) {
        reply.code(401).send({ error: 'Unauthorized', message: 'Valid dev token is required' });
      }
    }
  });

  return server;
};

const start = async () => {
    const server = await buildGateway();
    try {
        await server.listen({ port: 3000, host: '0.0.0.0' });
        logger.info('API Gateway is running on port 3000');
    } catch (error) {
        logger.error({ err: error }, 'Failed to start gateway');
        process.exit(1);
    }
};

start();
