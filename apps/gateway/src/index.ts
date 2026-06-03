import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import httpProxy from '@fastify/http-proxy';
import {
  getCorrelationId,
  getTraceId,
  healthPlugin,
  initializeTracing,
  injectObservabilityHeaders,
  logger,
  observabilityPlugin,
} from '@forgekit/shared-observability';
import { X_FORGEKIT_ROLE, X_FORGEKIT_USER_ID } from '@forgekit/shared-security';
import authRoutes from './routes/auth';

const SERVICE_NAME = 'gateway';
initializeTracing({ serviceName: SERVICE_NAME });

/**
 * Fallback JWT secret for local development only.
 * Must never be used in production — startup guard enforces this via SEC-013.
 */
const INSECURE_DEV_SECRET = 'forgekit-local-dev-secret';

/**
 * Exact route paths that are exempt from JWT verification.
 * Uses routeOptions.url (path only, no query string) to prevent bypass via SEC-011.
 */
const HEALTH_ENDPOINT_ALLOWLIST: ReadonlyArray<string> = ['/health/live', '/health/ready'];

/**
 * Resolves the JWT secret to use, enforcing production safety per SEC-013.
 * Crashes the process if running in production without a real secret.
 */
const resolveJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!secret || secret.trim() === '') {
    if (isProduction) {
      logger.fatal(
        { reason: 'JWT_SECRET environment variable is not set in production' },
        'Gateway startup aborted — insecure configuration detected'
      );
      process.exit(1);
    }

    logger.warn(
      'JWT_SECRET is not set — using insecure dev fallback; do not deploy to production'
    );
    return INSECURE_DEV_SECRET;
  }

  return secret;
};

/**
 * Parses the ALLOWED_ORIGINS env var into a string array.
 * Falls back to localhost origins in non-production environments.
 */
const resolveAllowedOrigins = (): string[] => {
  const rawOrigins = process.env.ALLOWED_ORIGINS;

  if (rawOrigins && rawOrigins.trim() !== '') {
    return rawOrigins.split(',').map((origin) => origin.trim());
  }

  if (process.env.NODE_ENV !== 'production') {
    return ['http://localhost:3000', 'http://localhost:3001'];
  }

  return [];
};

const buildGateway = async () => {
  const server = Fastify({ logger: false }); // We use our own logger instance inside handlers or inject it

  server.register(observabilityPlugin, { serviceName: SERVICE_NAME });

  // SEC-014: Register security headers and CORS before routes
  server.register(helmet);
  server.register(cors, { origin: resolveAllowedOrigins() });

  // SEC-013: JWT secret resolved with production safety guard
  server.register(jwt, {
    secret: resolveJwtSecret(),
  });

  server.register(healthPlugin, { serviceName: SERVICE_NAME });

  // Auth endpoint for dev token generation
  server.register(authRoutes, { prefix: '/auth' });

  // Proxy to example-service
  // Notice we use a preHandler to verify the JWT and inject it before proxying
  server.register(httpProxy, {
    upstream: process.env.EXAMPLE_SERVICE_URL || 'http://localhost:3001',
    prefix: '/api/example',
    preHandler: async (request, reply) => {
      // SEC-011: Compare exact route path against allowlist — never use substring search on request.url
      // which includes query string and is vulnerable to bypass via URL manipulation.
      const routePath = request.routeOptions?.url ?? '';
      if (HEALTH_ENDPOINT_ALLOWLIST.includes(routePath)) return;

      try {
        await request.jwtVerify();
        const user = request.user as { sub: string; role: string };

        // SEC-008: Use exported constants from @forgekit/shared-security instead of hardcoded strings
        request.headers[X_FORGEKIT_USER_ID] = user.sub;
        request.headers[X_FORGEKIT_ROLE] = user.role;
        Object.assign(request.headers, injectObservabilityHeaders());
      } catch (err) {
        logger.warn({ err, path: request.url }, 'Gateway authentication failed');
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Valid dev token is required',
          correlationId: getCorrelationId(),
          traceId: getTraceId(),
        });
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
