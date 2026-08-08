import { sendCodedError } from "@be-water/server-kernel/http/coded-error.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { getRequestContext } from "@be-water/server-kernel/lib/request-context.js";
import { withTenantScope } from "@be-water/server-kernel/lib/tenant-scope.js";
import {
  isValidModulePermission,
  type MergedPermissionCatalog,
} from "@be-water/server-kernel/runtime/collect-module-permissions.js";
import { getServerPermissionCatalog } from "@be-water/server-kernel/runtime/permission-catalog.js";
import {
  API_CLIENT_PERMISSIONS,
  platformAdminPermissionCacheKey,
  userPermissionCacheKey, type AuthActorType 
} from "@be-water/shared";

import {
  resolvePlatformAdminPermissions,
  resolveTenantUserPermissions,
} from "./permission-resolver.js";

import type {
  AuthzProvider,
  AuthzResult,
  PermissionCatalog,
  ProviderRegistry,
} from "@be-water/server-kernel/runtime/provider-registry.js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    userPermissions?: string[];
  }

  interface FastifyInstance {
    requirePermission: (
      permission: string,
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAnyPermission: (
      ...permissions: string[]
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /**
     * 软判定：只回真假，不改写 reply。
     *
     * 用于「同一个接口按权限收窄可见范围」的场景（如租户侧审计/错误日志：
     * 有 *_logs.read 看全租户，没有就只看本人），这类接口不该 403——
     * 403 会让无权限用户连自己的记录都取不到。
     */
    hasPermission: (
      request: FastifyRequest,
      permission: string,
    ) => Promise<boolean>;
  }
}

export interface PermissionCache {
  get: (
    key: string,
    callback: (err: Error | null, result?: { item: unknown } | null) => void,
  ) => void;
  set: (
    key: string,
    value: unknown,
    ttl: number,
    callback: (err: Error | null) => void,
  ) => void;
  delete?: (key: string, callback: (err: Error | null) => void) => void;
}

const PERMISSION_CACHE_TTL_MS = 300_000;

function getCachedPermissions(
  cache: PermissionCache,
  cacheKey: string,
): Promise<string[] | undefined> {
  return new Promise((resolve, reject) => {
    cache.get(cacheKey, (err, cached) => {
      if (err) {
        reject(err);
        return;
      }
      if (cached && typeof cached === "object" && "item" in cached) {
        resolve(cached.item as string[]);
        return;
      }
      resolve(undefined);
    });
  });
}

function setCachedPermissions(
  cache: PermissionCache,
  cacheKey: string,
  permissions: string[],
): Promise<void> {
  return new Promise((resolve, reject) => {
    cache.set(cacheKey, permissions, PERMISSION_CACHE_TTL_MS, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export async function loadActorPermissions(
  app: FastifyInstance,
  actorType: AuthActorType,
  actorId: string,
  isSystemAdmin: boolean,
  catalog: MergedPermissionCatalog,
): Promise<string[]> {
  if (actorType === "api_key") {
    return [...API_CLIENT_PERMISSIONS];
  }

  const cacheKey =
    actorType === "platform_admin"
      ? platformAdminPermissionCacheKey(actorId)
      : userPermissionCacheKey(actorId);

  let permissions: string[] | undefined;

  try {
    permissions = await getCachedPermissions(
      app.cache as PermissionCache,
      cacheKey,
    );
  } catch {
    app.log.warn("读取缓存失败，回退到数据库");
  }

  if (!permissions) {
    permissions =
      actorType === "platform_admin"
        ? await resolvePlatformAdminPermissions(
            actorId,
            isSystemAdmin,
            catalog,
          )
        : await resolveTenantUserPermissions(
            actorId,
            isSystemAdmin,
            catalog,
          );

    try {
      await setCachedPermissions(
        app.cache as PermissionCache,
        cacheKey,
        permissions,
      );
    } catch {
      app.log.warn("写入缓存失败，继续无缓存运行");
    }
  }

  return permissions ?? [];
}

export class PbacAuthzProvider implements AuthzProvider {
  constructor(
    private readonly app: FastifyInstance,
    private readonly catalog: MergedPermissionCatalog = getServerPermissionCatalog(),
  ) {}

  async resolveRequestPermissions(request: FastifyRequest): Promise<string[]> {
    if (!request.authUser) {
      return [];
    }
    const { userId, actor_type, is_system_admin } = request.authUser;
    const permissions = await loadActorPermissions(
      this.app,
      actor_type,
      userId,
      is_system_admin,
      this.catalog,
    );
    request.userPermissions = permissions;
    return permissions;
  }

  async check(
    request: FastifyRequest,
    permission: string,
  ): Promise<AuthzResult> {
    if (!request.authUser) {
      return { allowed: false, reason: "unauthorized" };
    }

    const { is_system_admin, actor_type } = request.authUser;
    if (is_system_admin || actor_type === "api_key") {
      return { allowed: true };
    }

    const permissions = await this.resolveRequestPermissions(request);
    return {
      allowed: permissions.includes(permission),
      reason: permissions.includes(permission) ? undefined : "forbidden",
    };
  }

  async checkAny(
    request: FastifyRequest,
    requiredPermissions: string[],
  ): Promise<AuthzResult> {
    if (!request.authUser) {
      return { allowed: false, reason: "unauthorized" };
    }

    const { is_system_admin, actor_type } = request.authUser;
    if (is_system_admin || actor_type === "api_key") {
      return { allowed: true };
    }

    const permissions = await this.resolveRequestPermissions(request);
    const allowed = requiredPermissions.some((p) => permissions.includes(p));
    return { allowed, reason: allowed ? undefined : "forbidden" };
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const tenantId = getRequestContext()?.tenant_id;
    if (!tenantId) {
      return [];
    }

    const user = await prisma.user.findFirst({
      where: withTenantScope(tenantId, { id: userId }),
      select: { is_system_admin: true },
    });
    if (!user) {
      return [];
    }
    return loadActorPermissions(
      this.app,
      "tenant_user",
      userId,
      user.is_system_admin,
      this.catalog,
    );
  }

  getPermissionCatalog(): PermissionCatalog {
    return {
      permissions: this.catalog.permissions,
      groups: this.catalog.groups,
    };
  }

  getMergedCatalog(): MergedPermissionCatalog {
    return this.catalog;
  }
}

export async function deleteCachedPermissionsForUser(
  app: FastifyInstance,
  userId: string,
): Promise<void> {
  await deleteCachedPermissions(app, userPermissionCacheKey(userId));
}

export async function deleteCachedPermissionsForPlatformAdmin(
  app: FastifyInstance,
  adminId: string,
): Promise<void> {
  await deleteCachedPermissions(app, platformAdminPermissionCacheKey(adminId));
}

async function deleteCachedPermissions(
  app: FastifyInstance,
  cacheKey: string,
): Promise<void> {
  if (!("cache" in app) || !app.cache) {
    return;
  }

  const cache = app.cache as PermissionCache;
  if (typeof cache.delete !== "function") {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    cache.delete!(cacheKey, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export async function invalidateUserPermissionCache(
  app: FastifyInstance,
  userId: string,
): Promise<void> {
  try {
    await deleteCachedPermissionsForUser(app, userId);
  } catch (err) {
    app.log.warn({ err, userId }, "清除权限缓存失败");
  }
}

export async function invalidatePlatformAdminPermissionCache(
  app: FastifyInstance,
  adminId: string,
): Promise<void> {
  try {
    await deleteCachedPermissionsForPlatformAdmin(app, adminId);
  } catch (err) {
    app.log.warn({ err, adminId }, "清除平台管理员权限缓存失败");
  }
}

export async function permissionMiddleware(
  app: FastifyInstance,
  registry: ProviderRegistry,
): Promise<void> {
  try {
    await app.register(import("@fastify/caching"), {});
  } catch {
    app.log.warn("缓存插件可能已注册");
  }

  const authz = registry.getAuthzProvider();
  const catalog =
    authz instanceof PbacAuthzProvider
      ? authz.getMergedCatalog()
      : getServerPermissionCatalog();

  app.decorate(
    "requirePermission",
    (permission: string) => async (request: FastifyRequest, reply) => {
      if (!request.authUser) {
        return sendCodedError(reply, 401, "common.unauthorized");
      }

      if (!isValidModulePermission(catalog, permission)) {
        app.log.warn(`检查了无效的权限：${permission}`);
        return sendCodedError(reply, 500, "permission.invalid");
      }

      const result = await authz.check(request, permission);
      if (!result.allowed) {
        const status = result.reason === "unauthorized" ? 401 : 403;
        return sendCodedError(
          reply,
          status,
          status === 401 ? "common.unauthorized" : "common.forbidden_permission",
        );
      }
    },
  );

  app.decorate(
    "hasPermission",
    async (request: FastifyRequest, permission: string) => {
      if (!request.authUser) {
        return false;
      }
      if (!isValidModulePermission(catalog, permission)) {
        app.log.warn(`检查了无效的权限：${permission}`);
        return false;
      }
      const result = await authz.check(request, permission);
      return result.allowed;
    },
  );

  app.decorate(
    "requireAnyPermission",
    (...requiredPermissions: string[]) =>
      async (request: FastifyRequest, reply) => {
        if (!request.authUser) {
          return sendCodedError(reply, 401, "common.unauthorized");
        }

        for (const permission of requiredPermissions) {
          if (!isValidModulePermission(catalog, permission)) {
            app.log.warn(`检查了无效的权限：${permission}`);
            return sendCodedError(reply, 500, "permission.invalid");
          }
        }

        const result = await authz.checkAny(request, requiredPermissions);
        if (!result.allowed) {
          const status = result.reason === "unauthorized" ? 401 : 403;
          return sendCodedError(
            reply,
            status,
            status === 401
              ? "common.unauthorized"
              : "common.forbidden_permission",
          );
        }
      },
  );
}
