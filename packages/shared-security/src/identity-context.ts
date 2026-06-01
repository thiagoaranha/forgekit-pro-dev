export const X_FORGEKIT_USER_ID = 'x-forgekit-user-id';
export const X_FORGEKIT_ROLE = 'x-forgekit-role';

export type IdentityContext = {
  userId: string | undefined;
  role: string | undefined;
};
