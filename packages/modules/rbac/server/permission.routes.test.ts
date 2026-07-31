import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { ValidationError } from "@be-water/server-kernel/lib/app-errors.js";
import {
  createRouteTestApp,
  createTestUserFast,
  grantPermission,
  resetUserPermissions,
  type TestApp,
  type TestUser,
} from "@be-water/server-test";
import { installTestPermissionCatalog } from "@be-water/server-test/permission-catalog";
import { userPermissionCacheKey } from "@be-water/shared";
import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
  afterEach,
  vi,
} from "vitest";

import { RoleService } from "./role.service.js";
import { permissionRoutes } from "./permission.routes.js";
import * as permissionResolver from "./permission-resolver.js";

import { AuditAction } from "../../audit/shared/index.js";

const auditEmit = vi.hoisted(() => ({
  emitAuditLogFromRequestSafe: vi.fn().mockResolvedValue(undefined),
}));

vi.mock(
  "@be-water/server-kernel/runtime/audit-log-emit.js",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("@be-water/server-kernel/runtime/audit-log-emit.js")
    >()),
    emitAuditLogFromRequestSafe: auditEmit.emitAuditLogFromRequestSafe,
  }),
);

interface PermissionCacheClient {
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
}

function getPermissionCacheEntry(
  app: TestApp,
  userId: string,
): Promise<{ item: unknown } | null> {
  return new Promise((resolve, reject) => {
    const cache = app.cache as PermissionCacheClient;
    cache.get(userPermissionCacheKey(userId), (err, result) => {
      if (err) reject(err);
      else resolve(result ?? null);
    });
  });
}

function seedPermissionCache(
  app: TestApp,
  userId: string,
  permissions: string[],
): Promise<void> {
  return new Promise((resolve, reject) => {
    const cache = app.cache as PermissionCacheClient;
    cache.set(userPermissionCacheKey(userId), permissions, 300_000, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

installTestPermissionCatalog([
  { key: "roles.read", label: "查看角色", group: "权限管理" },
  { key: "roles.write", label: "编辑角色", group: "权限管理" },
  { key: "roles.assign", label: "分配角色", group: "权限管理" },
]);

describe("Permission Routes", () => {
  let app: TestApp;
  let regularUser: TestUser;
  let systemAdmin: TestUser;

  beforeAll(async () => {
    app = await createRouteTestApp(async (instance) => {
      await instance.register(permissionRoutes, { prefix: "/api" });
    });
    regularUser = await createTestUserFast(app, "regular", "password123");
    systemAdmin = await createTestUserFast(app, "admin", "password123", {
      is_system_admin: true,
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await resetUserPermissions(app, regularUser.id);
  });

  afterAll(async () => {
    await app.close();
  });

  function authHeaders(user: TestUser) {
    return { authorization: `Bearer ${user.accessToken}` };
  }

  describe("GET /api/auth/permissions", () => {
    it("should return current user's permissions", async () => {
      await grantPermission(app, regularUser.id, "documents.read");
      await grantPermission(app, regularUser.id, "documents.write");

      const response = await app.inject({
        method: "GET",
        url: "/api/auth/permissions",
        headers: authHeaders(regularUser),
      });

      expect(response.statusCode).toBe(200);
      const { data } = JSON.parse(response.payload);
      expect(Array.isArray(data)).toBe(true);
      expect(data).toContain("documents.read");
      expect(data).toContain("documents.write");
    });

    it("should return all permissions for system admin", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/auth/permissions",
        headers: authHeaders(systemAdmin),
      });

      expect(response.statusCode).toBe(200);
      const { data } = JSON.parse(response.payload);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });

    it("should return empty array for user with no permissions", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/auth/permissions",
        headers: authHeaders(regularUser),
      });

      expect(response.statusCode).toBe(200);
      const { data } = JSON.parse(response.payload);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0);
    });

    it("should return 401 without authentication", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/auth/permissions",
      });
      expect(response.statusCode).toBe(401);
    });
  });

  describe("GET /api/permissions/catalog", () => {
    it("should return permission catalog for system admin", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/permissions/catalog",
        headers: authHeaders(systemAdmin),
      });

      expect(response.statusCode).toBe(200);
      const { data } = JSON.parse(response.payload);
      expect(Array.isArray(data.permissions)).toBe(true);
      expect(
        data.permissions.some((p: { key: string }) => p.key === "users.read"),
      ).toBe(true);
      expect(data.groups).toBeDefined();
      expect(typeof data.groups).toBe("object");
    });

    it("should return 403 for regular user", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/permissions/catalog",
        headers: authHeaders(regularUser),
      });
      expect(response.statusCode).toBe(403);
    });

    it("should return 401 without authentication", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/permissions/catalog",
      });
      expect(response.statusCode).toBe(401);
    });
  });

  describe("GET /api/roles", () => {
    it("should list tenant roles for system admin", async () => {
      vi.spyOn(RoleService, "listTenantRoles").mockResolvedValue([
        {
          id: "role-1",
          name: "管理员",
          description: null,
          scope: "tenant",
          is_builtin: true,
          permissions: ["users.read"],
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      const response = await app.inject({
        method: "GET",
        url: "/api/roles",
        headers: authHeaders(systemAdmin),
      });

      expect(response.statusCode).toBe(200);
      const { data } = JSON.parse(response.payload);
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe("管理员");
    });

    it("should return 403 for regular user", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/roles",
        headers: authHeaders(regularUser),
      });
      expect(response.statusCode).toBe(403);
    });
  });

  describe("POST /api/roles", () => {
    it("should create a role for system admin", async () => {
      vi.spyOn(RoleService, "createTenantRole").mockResolvedValue({
        id: "role-new",
        name: "编辑",
        description: null,
        scope: "tenant",
        is_builtin: false,
        permissions: ["documents.read"],
        created_at: new Date(),
        updated_at: new Date(),
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/roles",
        headers: authHeaders(systemAdmin),
        payload: {
          name: "编辑",
          permissions: ["documents.read"],
        },
      });

      expect(response.statusCode).toBe(201);
      const { data } = JSON.parse(response.payload);
      expect(data.name).toBe("编辑");
    });

    it("should return 400 if name is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/roles",
        headers: authHeaders(systemAdmin),
        payload: { permissions: ["documents.read"] },
      });
      expect(response.statusCode).toBe(400);
    });
  });

  // 角色 CRUD 直接改变权限边界，必须留下审计痕迹（登录页「审计可追溯」承诺）。
  describe("角色写操作的审计日志", () => {
    const roleDto = {
      id: "role-audit",
      name: "编辑",
      description: null,
      scope: "tenant" as const,
      is_builtin: false,
      permissions: ["documents.read"],
      created_at: new Date(),
      updated_at: new Date(),
    };

    beforeEach(() => {
      auditEmit.emitAuditLogFromRequestSafe.mockClear();
    });

    function lastAuditInput() {
      const calls = auditEmit.emitAuditLogFromRequestSafe.mock.calls;
      expect(calls.length).toBe(1);
      return calls[0][3] as { action: string; resource: string };
    }

    it("创建角色写入 ROLE_CREATE", async () => {
      vi.spyOn(RoleService, "createTenantRole").mockResolvedValue(roleDto);

      const response = await app.inject({
        method: "POST",
        url: "/api/roles",
        headers: authHeaders(systemAdmin),
        payload: { name: "编辑", permissions: ["documents.read"] },
      });

      expect(response.statusCode).toBe(201);
      expect(lastAuditInput()).toMatchObject({
        action: AuditAction.ROLE_CREATE,
        resource: "role:编辑",
      });
    });

    it("更新角色写入 ROLE_UPDATE", async () => {
      vi.spyOn(RoleService, "updateTenantRole").mockResolvedValue(roleDto);

      const response = await app.inject({
        method: "PUT",
        url: "/api/roles/role-audit",
        headers: authHeaders(systemAdmin),
        payload: { permissions: ["documents.read"] },
      });

      expect(response.statusCode).toBe(200);
      expect(lastAuditInput()).toMatchObject({
        action: AuditAction.ROLE_UPDATE,
        resource: "role:编辑",
      });
    });

    it("删除角色写入 ROLE_DELETE（含已删除角色名）", async () => {
      vi.spyOn(RoleService, "deleteTenantRole").mockResolvedValue("编辑");

      const response = await app.inject({
        method: "DELETE",
        url: "/api/roles/role-audit",
        headers: authHeaders(systemAdmin),
      });

      expect(response.statusCode).toBe(200);
      expect(lastAuditInput()).toMatchObject({
        action: AuditAction.ROLE_DELETE,
        resource: "role:编辑",
      });
    });

    it("角色写操作失败时不写审计", async () => {
      vi.spyOn(RoleService, "deleteTenantRole").mockRejectedValue(
        new ValidationError("role.builtin_undeletable"),
      );

      const response = await app.inject({
        method: "DELETE",
        url: "/api/roles/role-builtin",
        headers: authHeaders(systemAdmin),
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().code).toBe("role.builtin_undeletable");
      expect(auditEmit.emitAuditLogFromRequestSafe).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/users/:id/permissions", () => {
    it("should return user's permissions for system admin", async () => {
      await grantPermission(app, regularUser.id, "documents.read");
      await grantPermission(app, regularUser.id, "documents.write");

      const response = await app.inject({
        method: "GET",
        url: `/api/users/${regularUser.id}/permissions`,
        headers: authHeaders(systemAdmin),
      });

      expect(response.statusCode).toBe(200);
      const { data } = JSON.parse(response.payload);
      expect(data.user.id).toBe(regularUser.id);
      expect(data.user.username).toBe(regularUser.username);
      expect(Array.isArray(data.permissions)).toBe(true);
      expect(data.permissions).toContain("documents.read");
      expect(data.permissions).toContain("documents.write");
    });

    it("should return all permissions for system admin user", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/users/${systemAdmin.id}/permissions`,
        headers: authHeaders(systemAdmin),
      });

      expect(response.statusCode).toBe(200);
      const { data } = JSON.parse(response.payload);
      expect(data.user.is_system_admin).toBe(true);
      expect(Array.isArray(data.permissions)).toBe(true);
      expect(data.permissions.length).toBeGreaterThan(0);
    });

    it("should return 404 for non-existent user", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(null);

      const response = await app.inject({
        method: "GET",
        url: "/api/users/nonexistent-id/permissions",
        headers: authHeaders(systemAdmin),
      });
      expect(response.statusCode).toBe(404);
    });

    it("should return 403 for regular user", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/users/${regularUser.id}/permissions`,
        headers: authHeaders(regularUser),
      });
      expect(response.statusCode).toBe(403);
    });
  });

  describe("GET /api/users/:id/roles", () => {
    it("should return user roles for system admin", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({
        id: regularUser.id,
        username: regularUser.username,
        is_system_admin: false,
        user_roles: [
          {
            role: {
              id: "role-1",
              name: "编辑",
              description: null,
              scope: "tenant",
              is_builtin: false,
            },
          },
        ],
      } as never);

      const response = await app.inject({
        method: "GET",
        url: `/api/users/${regularUser.id}/roles`,
        headers: authHeaders(systemAdmin),
      });

      expect(response.statusCode).toBe(200);
      const { data } = JSON.parse(response.payload);
      expect(data.user.id).toBe(regularUser.id);
      expect(data.roles).toHaveLength(1);
      expect(data.roles[0].name).toBe("编辑");
    });
  });

  describe("PUT /api/users/:id/roles", () => {
    it("should update user roles for system admin", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: regularUser.id,
        username: regularUser.username,
        is_system_admin: false,
      } as never);
      vi.spyOn(permissionResolver, "setUserRoles").mockResolvedValue();
      vi.spyOn(RoleService, "listTenantRoles").mockResolvedValue([
        {
          id: "role-1",
          name: "编辑",
          description: null,
          scope: "tenant",
          is_builtin: false,
          permissions: ["documents.read"],
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      const response = await app.inject({
        method: "PUT",
        url: `/api/users/${regularUser.id}/roles`,
        headers: authHeaders(systemAdmin),
        payload: { role_ids: ["role-1"] },
      });

      expect(response.statusCode).toBe(200);
      const { data } = JSON.parse(response.payload);
      expect(data.roles).toHaveLength(1);
      expect(permissionResolver.setUserRoles).toHaveBeenCalledWith(
        regularUser.id,
        ["role-1"],
        expect.any(String),
      );
    });

    it("should invalidate permission cache after role update", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: regularUser.id,
        username: regularUser.username,
        is_system_admin: false,
      } as never);
      vi.spyOn(permissionResolver, "setUserRoles").mockResolvedValue();
      vi.spyOn(RoleService, "listTenantRoles").mockResolvedValue([]);
      await seedPermissionCache(app, regularUser.id, ["products.read"]);

      const stale = await getPermissionCacheEntry(app, regularUser.id);
      expect(stale?.item).toEqual(["products.read"]);

      const response = await app.inject({
        method: "PUT",
        url: `/api/users/${regularUser.id}/roles`,
        headers: authHeaders(systemAdmin),
        payload: { role_ids: [] },
      });

      expect(response.statusCode).toBe(200);

      const after = await getPermissionCacheEntry(app, regularUser.id);
      expect(after).toBeNull();
    });

    it("should return 400 if role_ids is not an array", async () => {
      const response = await app.inject({
        method: "PUT",
        url: `/api/users/${regularUser.id}/roles`,
        headers: authHeaders(systemAdmin),
        payload: { role_ids: "not-an-array" },
      });
      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when trying to modify system admin roles", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({
        id: systemAdmin.id,
        username: systemAdmin.username,
        is_system_admin: true,
      } as never);

      const response = await app.inject({
        method: "PUT",
        url: `/api/users/${systemAdmin.id}/roles`,
        headers: authHeaders(systemAdmin),
        payload: { role_ids: ["role-1"] },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().code).toBe("role.system_admin_immutable");
    });

    it("should return 403 for regular user", async () => {
      const response = await app.inject({
        method: "PUT",
        url: `/api/users/${regularUser.id}/roles`,
        headers: authHeaders(regularUser),
        payload: { role_ids: ["role-1"] },
      });
      expect(response.statusCode).toBe(403);
    });
  });
});
