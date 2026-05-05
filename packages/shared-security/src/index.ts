export type { IdentityContext } from './identity-context';
export { X_FORGEKIT_ROLE, X_FORGEKIT_USER_ID } from './identity-context';
export {
  extractIdentityFromHeaders,
  extractIdentityFromMessageHeaders,
  injectIdentityHeaders,
} from './identity-extraction';
export { requireIdentity, requireRole } from './guards';
export { identityPlugin } from './identity-plugin';
