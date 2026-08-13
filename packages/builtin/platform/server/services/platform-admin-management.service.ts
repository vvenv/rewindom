import { resolveSortField, resolveSortOrder } from "@rewindom/server-kernel/http/list-sort.js";
import { AuthService } from "@rewindom/server-kernel/kernel/auth/auth.service.js";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@rewindom/server-kernel/lib/app-errors.js";
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";

const PLATFORM_ADMIN_SORTABLE_FIELDS = new Set([
  "username",
  "is_system_admin",
  "enabled",
  "last_login_at",
  "created_at",
]);

function buildPlatformAdminOrderBy(
  sortBy?: string,
  sortDir?: "asc" | "desc",
): Array<
  | { username: "asc" | "desc" }
  | { is_system_admin: "asc" | "desc" }
  | { enabled: "asc" | "desc" }
  | { last_login_at: "asc" | "desc" }
  | { created_at: "asc" | "desc" }
> {
  const field = resolveSortField(
    sortBy,
    PLATFORM_ADMIN_SORTABLE_FIELDS,
    "created_at",
  );
  const order = resolveSortOrder(sortDir, "desc");
  return [{ [field]: order } as
    | { username: "asc" | "desc" }
    | { is_system_admin: "asc" | "desc" }
    | { enabled: "asc" | "desc" }
    | { last_login_at: "asc" | "desc" }
    | { created_at: "asc" | "desc" }];
}

export interface PlatformAdminListItem {
  id: string;
  username: string;
  is_system_admin: boolean;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
  last_access_at: Date | null;
  failed_login_attempts: number;
  locked_until: Date | null;
  roles: Array<{
    id: string;
    name: string;
    description: string | null;
    is_builtin: boolean;
  }>;
}

const adminSelect = {
  id: true,
  username: true,
  is_system_admin: true,
  enabled: true,
  created_at: true,
  updated_at: true,
  last_login_at: true,
  last_access_at: true,
  failed_login_attempts: true,
  locked_until: true,
  admin_roles: {
    select: {
      role: {
        select: {
          id: true,
          name: true,
          description: true,
          is_builtin: true,
        },
      },
    },
  },
} as const;

function toListItem(
  admin: {
    id: string;
    username: string;
    is_system_admin: boolean;
    enabled: boolean;
    created_at: Date;
    updated_at: Date;
    last_login_at: Date | null;
    last_access_at: Date | null;
    failed_login_attempts: number;
    locked_until: Date | null;
    admin_roles: Array<{
      role: {
        id: string;
        name: string;
        description: string | null;
        is_builtin: boolean;
      };
    }>;
  },
): PlatformAdminListItem {
  return {
    ...admin,
    roles: admin.admin_roles.map((row) => row.role),
  };
}

export class PlatformAdminManagementService {
  static async listAdmins(options?: {
    search?: string;
    skip?: number;
    take?: number;
    sort_by?: string;
    sort_dir?: "asc" | "desc";
  }): Promise<{ items: PlatformAdminListItem[]; total: number }> {
    const where = options?.search
      ? {
          username: {
            contains: options.search,
            mode: "insensitive" as const,
          },
        }
      : {};

    const [rows, total] = await Promise.all([
      prisma.platformAdmin.findMany({
        where,
        select: adminSelect,
        orderBy: buildPlatformAdminOrderBy(options?.sort_by, options?.sort_dir),
        ...(options?.skip !== undefined && { skip: options.skip }),
        ...(options?.take !== undefined && { take: options.take }),
      }),
      prisma.platformAdmin.count({ where }),
    ]);

    return {
      items: rows.map(toListItem),
      total,
    };
  }

  static async getAdminById(id: string): Promise<PlatformAdminListItem> {
    const admin = await prisma.platformAdmin.findUnique({
      where: { id },
      select: adminSelect,
    });
    if (!admin) {
      throw new NotFoundError("platform.admin_not_found");
    }
    return toListItem(admin);
  }

  static async createAdmin(input: {
    username: string;
    password: string;
    is_system_admin?: boolean;
    enabled?: boolean;
    role_ids?: string[];
  }): Promise<PlatformAdminListItem> {
    const username = input.username.trim();
    if (!username || username.includes("@")) {
      throw new ValidationError("auth.username_invalid");
    }
    if (input.password.length < 6) {
      throw new ValidationError("auth.password_min_6");
    }

    const existing = await prisma.platformAdmin.findUnique({
      where: { username },
    });
    if (existing) {
      throw new ConflictError("auth.username_exists");
    }

    const hashedPassword = await AuthService.hashPassword(input.password);
    const isSystemAdmin = input.is_system_admin ?? false;
    const roleIds = isSystemAdmin ? [] : (input.role_ids ?? []);

    if (!isSystemAdmin && roleIds.length > 0) {
      await assertValidPlatformRoleIds(roleIds);
    }

    const admin = await prisma.$transaction(async (tx) => {
      const created = await tx.platformAdmin.create({
        data: {
          username,
          password: hashedPassword,
          is_system_admin: isSystemAdmin,
          enabled: input.enabled ?? true,
        },
        select: { id: true },
      });

      if (!isSystemAdmin && roleIds.length > 0) {
        await tx.platformAdminRole.createMany({
          data: roleIds.map((role_id) => ({
            admin_id: created.id,
            role_id,
          })),
        });
      }

      return tx.platformAdmin.findUniqueOrThrow({
        where: { id: created.id },
        select: adminSelect,
      });
    });

    return toListItem(admin);
  }

  static async updateAdmin(input: {
    id: string;
    is_system_admin?: boolean;
    enabled?: boolean;
    role_ids?: string[];
  }): Promise<PlatformAdminListItem> {
    const existing = await prisma.platformAdmin.findUnique({
      where: { id: input.id },
    });
    if (!existing) {
      throw new NotFoundError("platform.admin_not_found");
    }

    const nextIsSystemAdmin = input.is_system_admin ?? existing.is_system_admin;
    if (
      existing.is_system_admin &&
      input.is_system_admin === false &&
      (await countSystemAdmins()) <= 1
    ) {
      throw new ValidationError("platform.admin_last_system_required");
    }

    if (input.role_ids !== undefined && !nextIsSystemAdmin) {
      await assertValidPlatformRoleIds(input.role_ids);
    }

    const admin = await prisma.$transaction(async (tx) => {
      await tx.platformAdmin.update({
        where: { id: input.id },
        data: {
          ...(input.is_system_admin !== undefined && {
            is_system_admin: input.is_system_admin,
          }),
          ...(input.enabled !== undefined && { enabled: input.enabled }),
        },
      });

      if (input.role_ids !== undefined && !nextIsSystemAdmin) {
        await tx.platformAdminRole.deleteMany({
          where: { admin_id: input.id },
        });
        if (input.role_ids.length > 0) {
          await tx.platformAdminRole.createMany({
            data: input.role_ids.map((role_id) => ({
              admin_id: input.id,
              role_id,
            })),
          });
        }
      }

      if (nextIsSystemAdmin) {
        await tx.platformAdminRole.deleteMany({
          where: { admin_id: input.id },
        });
      }

      return tx.platformAdmin.findUniqueOrThrow({
        where: { id: input.id },
        select: adminSelect,
      });
    });

    return toListItem(admin);
  }

  static async deleteAdmin(id: string, operatorId: string): Promise<void> {
    if (id === operatorId) {
      throw new ValidationError("auth.cannot_delete_self");
    }

    const existing = await prisma.platformAdmin.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("platform.admin_not_found");
    }

    if (existing.is_system_admin && (await countSystemAdmins()) <= 1) {
      throw new ValidationError("platform.admin_last_system_required");
    }

    await prisma.platformAdmin.delete({ where: { id } });
  }

  static async resetPassword(
    id: string,
    newPassword: string,
  ): Promise<{ password: string }> {
    if (newPassword.length < 6) {
      throw new ValidationError("auth.password_min_6");
    }

    const existing = await prisma.platformAdmin.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("platform.admin_not_found");
    }

    const hashedPassword = await AuthService.hashPassword(newPassword);
    await prisma.platformAdmin.update({
      where: { id },
      data: {
        password: hashedPassword,
        failed_login_attempts: 0,
        locked_until: null,
      },
    });

    await AuthService.revokeAllPlatformAdminTokens(id);
    return { password: newPassword };
  }
}

async function assertValidPlatformRoleIds(roleIds: string[]): Promise<void> {
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

async function countSystemAdmins(): Promise<number> {
  return prisma.platformAdmin.count({
    where: { is_system_admin: true, enabled: true },
  });
}
