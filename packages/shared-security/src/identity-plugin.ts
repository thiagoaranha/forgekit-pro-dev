import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

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
    fastify.decorateRequest('identity', null);
    fastify.addHook('onRequest', (request, _reply, done) => {
      request.identity = extractIdentityFromHeaders(request.headers);
      done();
    });
  },
  { name: 'forgekit-identity-plugin' }
);
