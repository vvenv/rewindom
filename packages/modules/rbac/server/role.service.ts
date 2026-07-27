import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { withTenantScope } from "@be-water/server-kernel/lib/tenant-scope.js";
import {
  isValidModulePermission,
  type MergedPermissionCatalog,
} from "@be-water/server-kernel/runtime/collect-module-permissions.js";

export interface RoleDto {
  id: string;
  name: string;
  description: string | null;
  scope: string;
  is_builtin: boolean;
  permissions: string[];
  created_at: Date;
  updated_at: Date;
}

function toRoleDto(role: {
  id: string;
  name: string;
  description: string | null;
  scope: string;
  is_builtin: boolean;
  created_at: Date;
  updated_at: Date;
  role_permissions: { permission: string }[];
}): RoleDto {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    scope: role.scope,
    is_builtin: role.is_builtin,
    permissions: role.role_permissions.map((p) => p.permission),
    created_at: role.created_at,
    updated_at: role.updated_at,
  };
}

const roleSelect = {
  id: true,
  name: true,
  description: true,
  scope: true,
  is_builtin: true,
  created_at: true,
  updated_at: true,
  role_permissions: { select: { permission: true } },
} as const;

export class RoleService {
  static async listTenantRoles(tenantId: string): Promise<RoleDto[]> {
    const roles = await prisma.role.findMany({
      where: withTenantScope(tenantId, { scope: "tenant" }),
      select: roleSelect,
      orderBy: [{ is_builtin: "desc" }, { name: "asc" }],
    });
    return roles.map(toRoleDto);
  }

  static async listPlatformRoles(): Promise<RoleDto[]> {
    const roles = await prisma.role.findMany({
      where: { scope: "platform", tenant_id: null },
      select: roleSelect,
      orderBy: [{ is_builtin: "desc" }, { name: "asc" }],
    });
    return roles.map(toRoleDto);
  }

  static async getTenantRole(
    tenantId: string,
    roleId: string,
  ): Promise<RoleDto | null> {
    const role = await prisma.role.findFirst({
      where: withTenantScope(tenantId, { id: roleId, scope: "tenant" }),
      select: roleSelect,
    });
    return role ? toRoleDto(role) : null;
  }

  static async getPlatformRole(roleId: string): Promise<RoleDto | null> {
    const role = await prisma.role.findFirst({
      where: { id: roleId, scope: "platform", tenant_id: null },
      select: roleSelect,
    });
    return role ? toRoleDto(role) : null;
  }

  static async createPlatformRole(
    input: { name: string; description?: string; permissions: string[] },
    catalog: MergedPermissionCatalog,
  ): Promise<RoleDto> {
    const permissions = validatePlatformPermissions(input.permissions, catalog);
    const role = await prisma.role.create({
      data: {
        name: input.name.trim(),
        description: input.description?.trim() || null,
        scope: "platform",
        tenant_id: null,
        role_permissions: {
          create: permissions.map((permission) => ({ permission })),
        },
      },
      select: roleSelect,
    });
    return toRoleDto(role);
  }

  static async updatePlatformRole(
    roleId: string,
    input: { name?: string; description?: string; permissions?: string[] },
    catalog: MergedPermissionCatalog,
  ): Promise<RoleDto> {
    const existing = await prisma.role.findFirst({
      where: { id: roleId, scope: "platform", tenant_id: null },
    });
    if (!existing) {
      throw new Error("角色不存在");
    }
    if (existing.is_builtin && input.permissions !== undefined) {
      throw new Error("内置角色不可修改权限");
    }

    const permissions =
      input.permissions !== undefined
        ? validatePlatformPermissions(input.permissions, catalog)
        : undefined;

    const role = await prisma.$transaction(async (tx) => {
      if (permissions !== undefined) {
        await tx.rolePermission.deleteMany({ where: { role_id: roleId } });
        if (permissions.length > 0) {
          await tx.rolePermission.createMany({
            data: permissions.map((permission) => ({
              role_id: roleId,
              permission,
            })),
          });
        }
      }
      return tx.role.update({
        where: { id: roleId, scope: "platform", tenant_id: null },
        data: {
          ...(input.name !== undefined && { name: input.name.trim() }),
          ...(input.description !== undefined && {
            description: input.description.trim() || null,
          }),
        },
        select: roleSelect,
      });
    });

    return toRoleDto(role);
  }

  /** Returns the deleted role's name so callers can write a meaningful audit entry. */
  static async deletePlatformRole(roleId: string): Promise<string> {
    const existing = await prisma.role.findFirst({
      where: { id: roleId, scope: "platform", tenant_id: null },
    });
    if (!existing) {
      throw new Error("角色不存在");
    }
    if (existing.is_builtin) {
      throw new Error("内置角色不可删除");
    }
    await prisma.role.delete({
      where: { id: roleId, scope: "platform", tenant_id: null },
    });
    return existing.name;
  }

  static async createTenantRole(
    tenantId: string,
    input: { name: string; description?: string; permissions: string[] },
    catalog: MergedPermissionCatalog,
  ): Promise<RoleDto> {
    const permissions = validateTenantPermissions(input.permissions, catalog);
    const role = await prisma.role.create({
      data: {
        name: input.name.trim(),
        description: input.description?.trim() || null,
        scope: "tenant",
        tenant_id: tenantId,
        role_permissions: {
          create: permissions.map((permission) => ({ permission })),
        },
      },
      select: roleSelect,
    });
    return toRoleDto(role);
  }

  static async updateTenantRole(
    tenantId: string,
    roleId: string,
    input: { name?: string; description?: string; permissions?: string[] },
    catalog: MergedPermissionCatalog,
  ): Promise<RoleDto> {
    const existing = await prisma.role.findFirst({
      where: withTenantScope(tenantId, { id: roleId, scope: "tenant" }),
    });
    if (!existing) {
      throw new Error("角色不存在");
    }
    if (existing.is_builtin && input.permissions !== undefined) {
      throw new Error("内置角色不可修改权限");
    }

    const permissions =
      input.permissions !== undefined
        ? validateTenantPermissions(input.permissions, catalog)
        : undefined;

    const role = await prisma.$transaction(async (tx) => {
      if (permissions !== undefined) {
        await tx.rolePermission.deleteMany({ where: { role_id: roleId } });
        if (permissions.length > 0) {
          await tx.rolePermission.createMany({
            data: permissions.map((permission) => ({
              role_id: roleId,
              permission,
            })),
          });
        }
      }
      return tx.role.update({
        where: withTenantScope(tenantId, { id: roleId }),
        data: {
          ...(input.name !== undefined && { name: input.name.trim() }),
          ...(input.description !== undefined && {
            description: input.description.trim() || null,
          }),
        },
        select: roleSelect,
      });
    });

    return toRoleDto(role);
  }

  /** Returns the deleted role's name so callers can write a meaningful audit entry. */
  static async deleteTenantRole(
    tenantId: string,
    roleId: string,
  ): Promise<string> {
    const existing = await prisma.role.findFirst({
      where: withTenantScope(tenantId, { id: roleId, scope: "tenant" }),
    });
    if (!existing) {
      throw new Error("角色不存在");
    }
    if (existing.is_builtin) {
      throw new Error("内置角色不可删除");
    }
    await prisma.role.delete({
      where: withTenantScope(tenantId, { id: roleId }),
    });
    return existing.name;
  }

  static async ensureBuiltinTenantRoles(
    tenantId: string,
    catalog: MergedPermissionCatalog,
  ): Promise<void> {
    const builtinRoles = [
      {
        name: "成员",
        description: "普通成员，无默认权限",
        permissions: [] as string[],
      },
      {
        name: "管理员",
        description: "租户管理员，拥有全部租户权限",
        permissions: [...catalog.tenantPermissionKeys],
      },
    ];

    for (const spec of builtinRoles) {
      await prisma.role.upsert({
        where: {
          scope_tenant_id_name: {
            scope: "tenant",
            tenant_id: tenantId,
            name: spec.name,
          },
        },
        create: {
          name: spec.name,
          description: spec.description,
          scope: "tenant",
          tenant_id: tenantId,
          is_builtin: true,
          role_permissions: {
            create: spec.permissions.map((permission) => ({ permission })),
          },
        },
        update: {},
      });
    }
  }

  static async ensureBuiltinPlatformRoles(
    catalog: MergedPermissionCatalog,
  ): Promise<void> {
    const builtinRoles = [
      {
        name: "平台管理员",
        description: "拥有全部平台权限",
        permissions: [...catalog.platformPermissionKeys],
      },
    ];

    for (const spec of builtinRoles) {
      const existing = await prisma.role.findFirst({
        where: { scope: "platform", tenant_id: null, name: spec.name },
      });
      if (existing) continue;

      await prisma.role.create({
        data: {
          name: spec.name,
          description: spec.description,
          scope: "platform",
          tenant_id: null,
          is_builtin: true,
          role_permissions: {
            create: spec.permissions.map((permission) => ({ permission })),
          },
        },
      });
    }
  }
}

function validatePlatformPermissions(
  permissions: string[],
  catalog: MergedPermissionCatalog,
): string[] {
  const invalid = permissions.filter(
    (p) =>
      !isValidModulePermission(catalog, p) ||
      !catalog.platformPermissionKeys.includes(p),
  );
  if (invalid.length > 0) {
    throw new Error(`无效权限：${invalid.join("、")}`);
  }
  return [...new Set(permissions)];
}

function validateTenantPermissions(
  permissions: string[],
  catalog: MergedPermissionCatalog,
): string[] {
  const invalid = permissions.filter(
    (p) =>
      !isValidModulePermission(catalog, p) ||
      !catalog.tenantPermissionKeys.includes(p),
  );
  if (invalid.length > 0) {
    throw new Error(`无效权限：${invalid.join("、")}`);
  }
  return [...new Set(permissions)];
}
