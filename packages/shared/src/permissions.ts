/** PBAC permission key (valid keys come from module manifests via permission catalog). */
export type Permission = string;

export function userPermissionCacheKey(userId: string): string {
  return `user:permissions:${userId}`;
}

export function platformAdminPermissionCacheKey(adminId: string): string {
  return `platform_admin:permissions:${adminId}`;
}

export function hasPermission(
  isSystemAdmin: boolean | undefined,
  permissions: readonly string[],
  permission: Permission,
): boolean {
  if (isSystemAdmin) return true;
  return permissions.includes(permission);
}

export function hasAnyPermission(
  isSystemAdmin: boolean | undefined,
  permissions: readonly string[],
  required: readonly Permission[],
): boolean {
  if (isSystemAdmin) return true;
  return required.some((p) => permissions.includes(p));
}

export function hasAllPermissions(
  isSystemAdmin: boolean | undefined,
  permissions: readonly string[],
  required: readonly Permission[],
): boolean {
  if (isSystemAdmin) return true;
  return required.every((p) => permissions.includes(p));
}
