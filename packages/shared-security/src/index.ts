export type { IdentityContext } from './identity-context.js';
export { X_FORGEKIT_ROLE, X_FORGEKIT_USER_ID } from './identity-context.js';
export {
  extractIdentityFromHeaders,
  extractIdentityFromMessageHeaders,
  injectIdentityHeaders,
} from './identity-extraction.js';
export { requireIdentity, requireRole } from './guards.js';
export { identityPlugin } from './identity-plugin.js';
