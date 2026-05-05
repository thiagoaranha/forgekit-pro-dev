import type { IdentityContext } from './identity-context';
import { X_FORGEKIT_ROLE, X_FORGEKIT_USER_ID } from './identity-context';

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (Array.isArray(value)) {
    return normalizeString(value[0]);
  }

  if (Buffer.isBuffer(value)) {
    return normalizeString(value.toString('utf8'));
  }

  return undefined;
};

export const extractIdentityFromHeaders = (
  headers: Record<string, string | string[] | undefined>
): IdentityContext => ({
  userId: normalizeString(headers[X_FORGEKIT_USER_ID]),
  role: normalizeString(headers[X_FORGEKIT_ROLE]),
});

export const extractIdentityFromMessageHeaders = (headers: Record<string, unknown>): IdentityContext => ({
  userId: normalizeString(headers[X_FORGEKIT_USER_ID]),
  role: normalizeString(headers[X_FORGEKIT_ROLE]),
});

export const injectIdentityHeaders = (identity: IdentityContext): Record<string, string> => {
  const headers: Record<string, string> = {};

  if (identity.userId) {
    headers[X_FORGEKIT_USER_ID] = identity.userId;
  }

  if (identity.role) {
    headers[X_FORGEKIT_ROLE] = identity.role;
  }

  return headers;
};
