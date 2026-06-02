import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { logger } from '@forgekit/shared-observability';

import { extractIdentityFromHeaders } from './identity-extraction.js';

declare module 'fastify' {
  interface FastifyRequest {
    identity: {
      userId: string | undefined;
      role: string | undefined;
    };
  }
}

export const identityPlugin = fp(
  async (fastify: FastifyInstance): Promise<void> => {
    fastify.decorateRequest('identity', null as any);
    fastify.addHook('onRequest', (request, _reply, done) => {
      request.identity = extractIdentityFromHeaders(request.headers);

      // SEC-001: Log anonymous requests at debug level so operators can discover
      // missing requireIdentity guards through log analysis without flooding production
      // logs (debug is silent unless explicitly enabled).
      if (request.identity.userId === undefined) {
        logger.debug({ event: 'anonymous_request', path: request.url });
      }

      done();
    });
  },
  { name: 'forgekit-identity-plugin' }
);
