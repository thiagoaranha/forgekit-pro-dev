import { forbiddenError, unauthorizedError } from '@forgekit/shared-error-handling';
import type { FastifyReply, FastifyRequest } from 'fastify';

export const requireIdentity = async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
  if (!request.identity?.userId) {
    throw unauthorizedError();
  }
};

export const requireRole =
  (...allowedRoles: string[]) =>
  async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (!request.identity?.userId) {
      throw unauthorizedError();
    }

    if (!request.identity.role || !allowedRoles.includes(request.identity.role)) {
      throw forbiddenError();
    }
  };
