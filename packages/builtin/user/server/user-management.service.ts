import { resolveSortField, resolveSortOrder } from "@rewindom/server-kernel/http/list-sort.js";
import { AuthService } from "@rewindom/server-kernel/kernel/auth/auth.service.js";
import { excludeInternalUsersWhere } from "@rewindom/server-kernel/kernel/auth/internal-users.js";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@rewindom/server-kernel/lib/app-errors.js";
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { withTenantScope } from "@rewindom/server-kernel/lib/tenant-scope.js";
import { isReservedTenantUsername } from "@rewindom/shared";

export interface CreateUserInput {
  tenant_id: string;
  username: string;
  password: string;
  is_system_admin?: boolean;
  role_ids?: string[];
}

export interface UpdateUserInput {
  tenant_id: string;
  id: string;
  is_system_admin?: boolean;
  enabled?: boolean;
  role_ids?: string[];
}

export interface ResetPasswordInput {
  tenant_id: string;
  userId: string;
  newPassword: string;
}

const TENANT_USER_SORTABLE_FIELDS = new Set([
  "username",
  "enabled",
  "last_login_at",
  "last_access_at",
  "created_at",
  "is_system_admin",
]);

function buildTenantUserOrderBy(
  sortBy?: string,
  sortDir?: "asc" | "desc",
): Array<
  | { username: "asc" | "desc" }
  | { enabled: "asc" | "desc" }
  | { last_login_at: "asc" | "desc" }
  | { last_access_at: "asc" | "desc" }
  | { created_at: "asc" | "desc" }
  | { is_system_admin: "asc" | "desc" }
> {
  const field = resolveSortField(
    sortBy,
    TENANT_USER_SORTABLE_FIELDS,
    "created_at",
  );
  const order = resolveSortOrder(sortDir, "desc");
  return [{ [field]: order } as
    | { username: "asc" | "desc" }
    | { enabled: "asc" | "desc" }
    | { last_login_at: "asc" | "desc" }
    | { last_access_at: "asc" | "desc" }
    | { created_at: "asc" | "desc" }
    | { is_system_admin: "asc" | "desc" }];
}

export class UserManagementService {
  static async getAllUsers(
    tenantId: string,
    skip?: number,
    take?: number,
    search?: string,
    sortBy?: string,
    sortDir?: "asc" | "desc",
  ): Promise<
    Array<{
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
    }>
  > {
    const where = withTenantScope(tenantId, {
      ...excludeInternalUsersWhere,
      ...(search
        ? {
            OR: [
              { username: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    });

    const users = await prisma.user.findMany({
      where,
      select: {
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
        user_roles: {
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
      },
      orderBy: buildTenantUserOrderBy(sortBy, sortDir),
      ...(skip !== undefined && { skip }),
      ...(take !== undefined && { take }),
    });

    return users.map((user) => ({
      ...user,
      roles: user.user_roles.map((ur) => ur.role),
      user_roles: undefined,
    })) as Array<{
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
    }>;
  }

  static async getUserDisplayCatalog(
    tenantId: string,
    options?: { search?: string; skip?: number; take?: number },
  ): Promise<{
    items: Array<{ id: string; username: string }>;
    total: number;
  }> {
    const where = withTenantScope(tenantId, {
      ...excludeInternalUsersWhere,
      ...(options?.search
        ? {
            OR: [
              {
                username: {
                  contains: options.search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
    });

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, username: true },
        orderBy: { username: "asc" },
        ...(options?.skip !== undefined && { skip: options.skip }),
        ...(options?.take !== undefined && { take: options.take }),
      }),
      prisma.user.count({ where }),
    ]);

    return { items, total };
  }

  static async getUsersCount(
    tenantId: string,
    search?: string,
  ): Promise<number> {
    const where = withTenantScope(tenantId, {
      ...excludeInternalUsersWhere,
      ...(search
        ? {
            OR: [
              { username: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    });
    return prisma.user.count({ where });
  }

  static async createUser(input: CreateUserInput): Promise<{
    id: string;
    username: string;
    is_system_admin: boolean;
    enabled: boolean;
    created_at: Date;
    updated_at: Date;
  }> {
    const {
      tenant_id,
      username,
      password,
      is_system_admin = false,
      role_ids = [],
    } = input;

    if (isReservedTenantUsername(username)) {
      throw new ValidationError("user.username_reserved");
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        tenant_id_username: { tenant_id, username },
      },
    });

    if (existingUser) {
      throw new ConflictError("auth.username_exists");
    }

    const hashedPassword = await AuthService.hashPassword(password);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          tenant_id,
          username,
          password: hashedPassword,
          is_system_admin,
        },
        select: {
          id: true,
          username: true,
          is_system_admin: true,
          enabled: true,
          created_at: true,
          updated_at: true,
        },
      });

      if (!is_system_admin && role_ids.length > 0) {
        const validRoles = await tx.role.findMany({
          where: {
            id: { in: role_ids },
            scope: "tenant",
            tenant_id,
          },
          select: { id: true },
        });
        if (validRoles.length !== role_ids.length) {
          throw new ValidationError("role.invalid_roles");
        }
        await tx.userRole.createMany({
          data: role_ids.map((role_id) => ({
            user_id: created.id,
            role_id,
          })),
        });
      }

      return created;
    });

    return user;
  }

  static async getUserByIdAdmin(
    tenantId: string,
    userId: string,
  ): Promise<{
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
  }> {
    const user = await prisma.user.findFirst({
      where: withTenantScope(tenantId, { id: userId }),
      select: {
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
        user_roles: {
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
      },
    });

    if (!user) {
      throw new NotFoundError("user.not_found");
    }

    return {
      ...user,
      roles: user.user_roles.map((ur) => ur.role),
    };
  }

  static async updateUser(input: UpdateUserInput): Promise<{
    id: string;
    username: string;
    is_system_admin: boolean;
    enabled: boolean;
    created_at: Date;
    updated_at: Date;
    last_login_at: Date | null;
  }> {
    const {
      tenant_id: tenantId,
      id,
      is_system_admin,
      enabled,
      role_ids,
    } = input;

    const existingUser = await prisma.user.findFirst({
      where: withTenantScope(tenantId, { id }),
    });

    if (!existingUser) {
      throw new NotFoundError("user.not_found");
    }

    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: withTenantScope(tenantId, { id }),
        data: {
          ...(is_system_admin !== undefined && { is_system_admin }),
          ...(enabled !== undefined && { enabled }),
        },
        select: {
          id: true,
          username: true,
          is_system_admin: true,
          enabled: true,
          created_at: true,
          updated_at: true,
          last_login_at: true,
        },
      });

      if (role_ids !== undefined && !updated.is_system_admin) {
        const validRoles = await tx.role.findMany({
          where: {
            id: { in: role_ids },
            scope: "tenant",
            tenant_id: tenantId,
          },
          select: { id: true },
        });
        if (validRoles.length !== role_ids.length) {
          throw new ValidationError("role.invalid_roles");
        }
        await tx.userRole.deleteMany({ where: { user_id: id } });
        if (role_ids.length > 0) {
          await tx.userRole.createMany({
            data: role_ids.map((role_id) => ({ user_id: id, role_id })),
          });
        }
      }

      return updated;
    });

    return user;
  }

  static async deleteUser(tenantId: string, userId: string): Promise<void> {
    const existingUser = await prisma.user.findFirst({
      where: withTenantScope(tenantId, { id: userId }),
    });

    if (!existingUser) {
      throw new NotFoundError("user.not_found");
    }

    await prisma.user.delete({
      where: withTenantScope(tenantId, { id: userId }),
    });
  }

  static async deleteUsers(
    tenantId: string,
    userIds: string[],
  ): Promise<string[]> {
    if (userIds.length === 0) {
      throw new ValidationError("user.id_required");
    }

    const existingUsers = await prisma.user.findMany({
      where: withTenantScope(tenantId, { id: { in: userIds } }),
      select: { id: true, username: true },
    });

    const existingIds = new Set(existingUsers.map((u) => u.id));
    const missingIds = userIds.filter((id) => !existingIds.has(id));

    if (missingIds.length > 0) {
      throw new NotFoundError("user.not_found_batch", {
        ids: missingIds.join("、"),
      });
    }

    await prisma.user.deleteMany({
      where: withTenantScope(tenantId, { id: { in: userIds } }),
    });

    return existingUsers.map((user) => user.username);
  }

  static async resetPassword(
    input: ResetPasswordInput,
  ): Promise<{ password: string }> {
    const { tenant_id: tenantId, userId, newPassword } = input;

    const existingUser = await prisma.user.findFirst({
      where: withTenantScope(tenantId, { id: userId }),
    });

    if (!existingUser) {
      throw new NotFoundError("user.not_found");
    }

    const hashedPassword = await AuthService.hashPassword(newPassword);

    await prisma.user.update({
      where: withTenantScope(tenantId, { id: userId }),
      data: {
        password: hashedPassword,
        failed_login_attempts: 0,
        locked_until: null,
      },
    });

    await AuthService.revokeAllUserTokens(userId);

    return { password: newPassword };
  }
}
