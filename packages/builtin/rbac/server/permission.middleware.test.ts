import { ProviderRegistry } from "@rewindom/server-kernel/runtime/provider-registry.js";
import { installTestPermissionCatalog } from "@rewindom/server-test/permission-catalog";
import { userPermissionCacheKey } from "@rewindom/shared";
import Fastify, { type FastifyInstance } from "fastify";
import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  invalidateUserPermissionCache,
  PbacAuthzProvider,
  permissionMiddleware,
  type PermissionCache,
} from "./permission.middleware.js";

vi.mock("@rewindom/server-kernel/lib/prisma.js", () => ({
  prisma: {
    userRole: {
      findMany: vi.fn(),
    },
    platformAdminRole: {
      findMany: vi.fn(),
    },
  },
}));

const cacheDelete = vi.fn((key: string, callback: (err: null) => void) => {
  callback(null);
});

vi.mock("@fastify/caching", () => ({
  default: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: cacheDelete,
  })),
}));

const { prisma } = await import("@rewindom/server-kernel/lib/prisma.js");

installTestPermissionCatalog([
  {
    key: "platform.admins.read",
    label: "查看平台管理员",
    group: "平台权限",
    scope: "platform",
  },
]);

const tenantAuthUser = {
  tenant_id: "tenant-123",
  tenant_slug: "tenant-123",
  userId: "user-123",
  username: "testuser",
  actor_type: "tenant_user" as const,
  is_system_admin: false,
};

const platformAuthUser = {
  tenant_id: "",
  tenant_slug: "",
  userId: "admin-123",
  username: "platform",
  actor_type: "platform_admin" as const,
  is_system_admin: false,
};

describe("permission.middleware", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify({ logger: false });
    const registry = new ProviderRegistry();
    registry.setAuthzProvider(new PbacAuthzProvider(app));
    await permissionMiddleware(app, registry);
  });

  describe("requirePermission decorator", () => {
    it("should return 401 when authUser is not set", async () => {
      app.get("/api/test", async (request, reply) => {
        await app.requirePermission("users.read")(request, reply);
        return reply.send({ success: true });
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/test",
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({
        error: "未授权",
        code: "common.unauthorized",
      });
    });

    it("should allow system admin without checking permissions", async () => {
      app.get("/api/test", async (request, reply) => {
        request.authUser = {
          ...tenantAuthUser,
          is_system_admin: true,
        };
        await app.requirePermission("users.read")(request, reply);
        return reply.send({ success: true });
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/test",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ success: true });
    });

    it("should return 500 for invalid permission", async () => {
      app.get("/api/test", async (request, reply) => {
        request.authUser = tenantAuthUser;
        await app.requirePermission("invalid.permission")(request, reply);
        return reply.send({ success: true });
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/test",
      });

      expect(response.statusCode).toBe(500);
      expect(response.json()).toEqual({
        error: "无效权限",
        code: "permission.invalid",
      });
    });

    it("should return 403 when user lacks permission", async () => {
      vi.mocked(prisma.userRole.findMany).mockResolvedValue([
        {
          role: {
            scope: "tenant",
            role_permissions: [{ permission: "orders.read" }],
          },
        },
      ] as never);

      app.get("/api/test", async (request, reply) => {
        request.authUser = tenantAuthUser;
        await app.requirePermission("users.read")(request, reply);
        return reply.send({ success: true });
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/test",
      });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toEqual({
        error: "无权访问：权限不足",
        code: "common.forbidden_permission",
      });
    });

    it("should allow user with required permission", async () => {
      vi.mocked(prisma.userRole.findMany).mockResolvedValue([
        {
          role: {
            scope: "tenant",
            role_permissions: [{ permission: "users.read" }],
          },
        },
      ] as never);

      app.get("/api/test", async (request, reply) => {
        request.authUser = tenantAuthUser;
        await app.requirePermission("users.read")(request, reply);
        return reply.send({ success: true });
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/test",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ success: true });
    });

    it("should query database when cache is empty", async () => {
      vi.mocked(prisma.userRole.findMany).mockResolvedValue([
        {
          role: {
            scope: "tenant",
            role_permissions: [{ permission: "users.read" }],
          },
        },
      ] as never);

      app.get("/api/test", async (request, reply) => {
        request.authUser = tenantAuthUser;
        await app.requirePermission("users.read")(request, reply);
        return reply.send({ success: true });
      });

      await app.inject({
        method: "GET",
        url: "/api/test",
      });

      expect(prisma.userRole.findMany).toHaveBeenCalledWith({
        where: { user_id: "user-123" },
        select: {
          role: {
            select: {
              scope: true,
              role_permissions: { select: { permission: true } },
            },
          },
        },
      });
    });

    it("should handle user with no permissions", async () => {
      vi.mocked(prisma.userRole.findMany).mockResolvedValue([]);

      app.get("/api/test", async (request, reply) => {
        request.authUser = tenantAuthUser;
        await app.requirePermission("users.read")(request, reply);
        return reply.send({ success: true });
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/test",
      });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toEqual({
        error: "无权访问：权限不足",
        code: "common.forbidden_permission",
      });
    });
  });

  describe("platform scope", () => {
    it("should allow platform system admin without any role", async () => {
      vi.mocked(prisma.platformAdminRole.findMany).mockResolvedValue([]);

      app.get("/api/test", async (request, reply) => {
        request.authUser = { ...platformAuthUser, is_system_admin: true };
        await app.requirePermission("platform.admins.read")(request, reply);
        return reply.send({ success: true });
      });

      const response = await app.inject({ method: "GET", url: "/api/test" });

      expect(response.statusCode).toBe(200);
      expect(prisma.platformAdminRole.findMany).not.toHaveBeenCalled();
    });

    it("should allow platform admin whose role grants the permission", async () => {
      vi.mocked(prisma.platformAdminRole.findMany).mockResolvedValue([
        {
          role: {
            scope: "platform",
            role_permissions: [{ permission: "platform.admins.read" }],
          },
        },
      ] as never);

      app.get("/api/test", async (request, reply) => {
        request.authUser = platformAuthUser;
        await app.requirePermission("platform.admins.read")(request, reply);
        return reply.send({ success: true });
      });

      const response = await app.inject({ method: "GET", url: "/api/test" });

      expect(response.statusCode).toBe(200);
    });

    it("should return 403 for platform admin without the permission", async () => {
      vi.mocked(prisma.platformAdminRole.findMany).mockResolvedValue([]);

      app.get("/api/test", async (request, reply) => {
        request.authUser = platformAuthUser;
        await app.requirePermission("platform.admins.read")(request, reply);
        return reply.send({ success: true });
      });

      const response = await app.inject({ method: "GET", url: "/api/test" });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("invalidateUserPermissionCache", () => {
    it("should delete the user's permission cache entry", async () => {
      const mockCache: PermissionCache = {
        get: vi.fn(),
        set: vi.fn(),
        delete: cacheDelete,
      };
      app.cache = mockCache as unknown as typeof app.cache;

      await invalidateUserPermissionCache(app, "user-123");

      expect(cacheDelete).toHaveBeenCalledWith(
        userPermissionCacheKey("user-123"),
        expect.any(Function),
      );
    });
  });
});
