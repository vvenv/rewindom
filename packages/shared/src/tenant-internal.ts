/** Disabled internal user for platform impersonation; not password-loginable. */
export const TENANT_IMPERSONATION_USERNAME = "__support_impersonation__";

const RESERVED_TENANT_USERNAMES = [
  TENANT_IMPERSONATION_USERNAME,
  "__platform_system__",
] as const;

export function isReservedTenantUsername(username: string): boolean {
  return (RESERVED_TENANT_USERNAMES as readonly string[]).includes(username);
}
