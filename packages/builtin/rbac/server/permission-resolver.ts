import { ValidationError } from "@be-water/server-kernel/lib/app-errors.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";

import type { MergedPermissionCatalog } from "@be-water/server-kernel/runtime/collect-module-permissions.js";

export type PermissionScope = "tenant" | "platform";

export async function resolveTenantUserPermissions(
  userId: string,
  isSystemAdmin: boolean,
  catalog: MergedPermissionCatalog,
): Promise<string[]> {
  if (isSystemAdmin) {
    return [...catalog.tenantPermissionKeys];
  }

  const rows = await prisma.userRole.findMany({
    where: { user_id: userId },
    select: {
      role: {
        select: {
          scope: true,
          role_permissions: { select: { permission: true } },
        },
      },
    },
  });

  const permissions = new Set<string>();
  for (const row of rows) {
    if (row.role.scope !== "tenant") continue;
    for (const rp of row.role.role_permissions) {
      if (catalog.tenantPermissionKeys.includes(rp.permission)) {
        permissions.add(rp.permission);
      }
    }
  }
  return [...permissions];
}

export async function resolvePlatformAdminPermissions(
  adminId: string,
  isSystemAdmin: boolean,
  catalog: MergedPermissionCatalog,
): Promise<string[]> {
  if (isSystemAdmin) {
    return [...catalog.platformPermissionKeys];
  }

  const rows = await prisma.platformAdminRole.findMany({
    where: { admin_id: adminId },
    select: {
      role: {
        select: {
          scope: true,
          role_permissions: { select: { permission: true } },
        },
      },
    },
  });

  const permissions = new Set<string>();
  for (const row of rows) {
    if (row.role.scope !== "platform") continue;
    for (const rp of row.role.role_permissions) {
      if (catalog.platformPermissionKeys.includes(rp.permission)) {
        permissions.add(rp.permission);
      }
    }
  }
  return [...permissions];
}

export async function getUserRoleIds(userId: string): Promise<string[]> {
  const rows = await prisma.userRole.findMany({
    where: { user_id: userId },
    select: { role_id: true },
  });
  return rows.map((r) => r.role_id);
}

export async function setPlatformAdminRoles(
  adminId: string,
  roleIds: string[],
): Promise<void> {
  if (roleIds.length > 0) {
    const validRoles = await prisma.role.findMany({
      where: {
        id: { in: roleIds },
        scope: "platform",
        tenant_id: null,
      },
      select: { id: true },
    });
    if (validRoles.length !== roleIds.length) {
      throw new ValidationError("role.invalid_roles");
    }
  }

  await prisma.$transaction([
    prisma.platformAdminRole.deleteMany({ where: { admin_id: adminId } }),
    ...(roleIds.length > 0
      ? [
          prisma.platformAdminRole.createMany({
            data: roleIds.map((role_id) => ({ admin_id: adminId, role_id })),
          }),
        ]
      : []),
  ]);
}

export async function setUserRoles(
  userId: string,
  roleIds: string[],
  tenantId: string,
): Promise<void> {
  if (roleIds.length > 0) {
    const validRoles = await prisma.role.findMany({
      where: {
        id: { in: roleIds },
        scope: "tenant",
        tenant_id: tenantId,
      },
      select: { id: true },
    });
    if (validRoles.length !== roleIds.length) {
      throw new ValidationError("role.invalid_roles");
    }
  }

  await prisma.$transaction([
    prisma.userRole.deleteMany({ where: { user_id: userId } }),
    ...(roleIds.length > 0
      ? [
          prisma.userRole.createMany({
            data: roleIds.map((role_id) => ({ user_id: userId, role_id })),
          }),
        ]
      : []),
  ]);
}
