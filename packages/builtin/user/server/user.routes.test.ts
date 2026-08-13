import * as auditLogEmit from "@rewindom/server-kernel/runtime/audit-log-emit.js";
import {
  ConflictError,
  NotFoundError,
} from "@rewindom/server-kernel/lib/app-errors.js";
import {
  createRouteTestApp,
  createTestUserFast,
  grantPermission,
  resetUserPermissions,
  type TestApp,
  type TestUser,
} from "@rewindom/server-test";
import { installTestPermissionCatalog } from "@rewindom/server-test/permission-catalog";
import { DEFAULT_TENANT_ID } from "@rewindom/shared";
import {
  describe,
  it,
  expect,
  beforeAll,
  afterEach,
  afterAll,
  vi,
} from "vitest";

import { AuditAction } from "../../audit/shared/index.js";
import { permissionRoutes } from "../../rbac/server/permission.routes.js";

import { UserManagementService } from "./user-management.service.js";
import { userRoutes } from "./user.routes.js";

vi.mock("../../platform/server/services/tenant-limit.service.js", () => ({
  assertTenantLimitNotExceeded: vi.fn().mockResolvedValue(undefined),
  isLimitExceededError: vi.fn().mockReturnValue(false),
}));

function makeUserRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    username: "someuser",
    is_system_admin: false,
    enabled: true,
    created_at: new Date(),
    updated_at: new Date(),
    last_login_at: null,
    last_access_at: null,
    failed_login_attempts: 0,
    locked_until: null,
    roles: [],
    ...overrides,
  };
}

installTestPermissionCatalog();

describe("User Routes", () => {
  let app: TestApp;
  let adminUser: TestUser;
  let regularUser: TestUser;

  beforeAll(async () => {
    app = await createRouteTestApp(async (instance) => {
      await instance.register(permissionRoutes, { prefix: "/api" });
      await instance.register(userRoutes, { prefix: "/api/users" });
    });
    adminUser = await createTestUserFast(app, "admin", "password123", {
      is_system_admin: true,
    });
    regularUser = await createTestUserFast(app, "regular", "password123");
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

  describe("GET /api/users/display-catalog", () => {
    it("should return id and username for any logged-in user", async () => {
      vi.spyOn(
        UserManagementService,
        "getUserDisplayCatalog",
      ).mockResolvedValue({
        items: [{ id: "user-1", username: "proc-user" }],
        total: 1,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/users/display-catalog",
        headers: authHeaders(regularUser),
      });

      expect(response.statusCode).toBe(200);
      const { data } = JSON.parse(response.payload);
      expect(data.items).toEqual([{ id: "user-1", username: "proc-user" }]);
      expect(data.total).toBe(1);
    });

    it("should support search and pagination query params", async () => {
      const getUserDisplayCatalog = vi
        .spyOn(UserManagementService, "getUserDisplayCatalog")
        .mockResolvedValue({
          items: [{ id: "user-1", username: "proc-user" }],
          total: 1,
        });

      const response = await app.inject({
        method: "GET",
        url: "/api/users/display-catalog?page=1&page_size=10&search=proc",
        headers: authHeaders(regularUser),
      });

      expect(response.statusCode).toBe(200);
      expect(getUserDisplayCatalog).toHaveBeenCalledWith(expect.any(String), {
        search: "proc",
        skip: 0,
        take: 10,
      });
    });

    it("should allow page_size up to 999 for catalog fetch", async () => {
      const getUserDisplayCatalog = vi
        .spyOn(UserManagementService, "getUserDisplayCatalog")
        .mockResolvedValue({
          items: [],
          total: 0,
        });

      const response = await app.inject({
        method: "GET",
        url: "/api/users/display-catalog?page=1&page_size=999",
        headers: authHeaders(regularUser),
      });

      expect(response.statusCode).toBe(200);
      const { data } = JSON.parse(response.payload);
      expect(data.page_size).toBe(999);
      expect(getUserDisplayCatalog).toHaveBeenCalledWith(expect.any(String), {
        search: undefined,
        skip: 0,
        take: 999,
      });
    });
  });

  describe("GET /api/users", () => {
    it("should get all users with users.read permission", async () => {
      vi.spyOn(UserManagementService, "getAllUsers").mockResolvedValue([
        makeUserRecord(),
      ]);
      vi.spyOn(UserManagementService, "getUsersCount").mockResolvedValue(1);

      const response = await app.inject({
        method: "GET",
        url: "/api/users",
        headers: authHeaders(adminUser),
      });

      expect(response.statusCode).toBe(200);
      const { data } = JSON.parse(response.payload);
      expect(data).toHaveProperty("items");
      expect(data).toHaveProperty("total", 1);
      expect(Array.isArray(data.items)).toBe(true);
    });

    it("should return 403 without users.read permission", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/users",
        headers: authHeaders(regularUser),
      });
      expect(response.statusCode).toBe(403);
    });

    it("should support pagination", async () => {
      vi.spyOn(UserManagementService, "getAllUsers").mockResolvedValue([]);
      vi.spyOn(UserManagementService, "getUsersCount").mockResolvedValue(0);

      const response = await app.inject({
        method: "GET",
        url: "/api/users?page=1&page_size=10",
        headers: authHeaders(adminUser),
      });

      expect(response.statusCode).toBe(200);
      const { data } = JSON.parse(response.payload);
      expect(data.page).toBe(1);
      expect(data.page_size).toBe(10);
    });

    it("should pass search term to the service", async () => {
      const getAllUsers = vi
        .spyOn(UserManagementService, "getAllUsers")
        .mockResolvedValue([makeUserRecord({ username: "admin" })]);
      vi.spyOn(UserManagementService, "getUsersCount").mockResolvedValue(1);

      const response = await app.inject({
        method: "GET",
        url: "/api/users?search=admin",
        headers: authHeaders(adminUser),
      });

      expect(response.statusCode).toBe(200);
      expect(getAllUsers).toHaveBeenCalledWith(
        expect.any(String),
        0,
        20,
        "admin",
        undefined,
        undefined,
      );
    });
  });

  describe("POST /api/users", () => {
    it("should create a new user with users.write permission", async () => {
      vi.spyOn(UserManagementService, "createUser").mockResolvedValue(
        makeUserRecord({ id: "new-id", username: "newuser" }),
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/users",
        headers: authHeaders(adminUser),
        payload: { username: "newuser", password: "password123" },
      });

      expect(response.statusCode).toBe(200);
      const { data } = JSON.parse(response.payload);
      expect(data).toHaveProperty("id");
      expect(data).toHaveProperty("username", "newuser");
    });

    it("should return 403 without users.write permission", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/users",
        headers: authHeaders(regularUser),
        payload: { username: "newuser", password: "password123" },
      });
      expect(response.statusCode).toBe(403);
    });

    it("should return 400 if username or password is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/users",
        headers: authHeaders(adminUser),
        payload: { username: "newuser" },
      });
      expect(response.statusCode).toBe(400);
    });

    it("should return 400 if password is too short", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/users",
        headers: authHeaders(adminUser),
        payload: { username: "newuser", password: "12345" },
      });
      expect(response.statusCode).toBe(400);
    });

    it("should return 409 if username already exists", async () => {
      vi.spyOn(UserManagementService, "createUser").mockRejectedValue(
        new ConflictError("auth.username_exists"),
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/users",
        headers: authHeaders(adminUser),
        payload: { username: adminUser.username, password: "password123" },
      });
      expect(response.statusCode).toBe(409);
      expect(response.json().code).toBe("auth.username_exists");
    });
  });

  describe("GET /api/users/:id", () => {
    it("should get a single user with users.read permission", async () => {
      vi.spyOn(UserManagementService, "getUserByIdAdmin").mockResolvedValue(
        makeUserRecord({ id: adminUser.id }),
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/users/${adminUser.id}`,
        headers: authHeaders(adminUser),
      });

      expect(response.statusCode).toBe(200);
      const { data } = JSON.parse(response.payload);
      expect(data).toHaveProperty("id", adminUser.id);
    });

    it("should return 403 without users.read permission", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/users/${adminUser.id}`,
        headers: authHeaders(regularUser),
      });
      expect(response.statusCode).toBe(403);
    });

    it("should return 404 if user not found", async () => {
      vi.spyOn(UserManagementService, "getUserByIdAdmin").mockRejectedValue(
        new NotFoundError("user.not_found"),
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/users/nonexistent-id",
        headers: authHeaders(adminUser),
      });
      expect(response.statusCode).toBe(404);
      expect(response.json().code).toBe("user.not_found");
    });
  });

  describe("PATCH /api/users/:id", () => {
    it("should update a user with users.write permission", async () => {
      vi.spyOn(UserManagementService, "updateUser").mockResolvedValue(
        makeUserRecord({ id: regularUser.id, username: "updatedusername" }),
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${regularUser.id}`,
        headers: authHeaders(adminUser),
        payload: { enabled: true },
      });

      expect(response.statusCode).toBe(200);
      const { data } = JSON.parse(response.payload);
      expect(data).toHaveProperty("username", "updatedusername");
    });

    it("should return 400 when trying to change username", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${regularUser.id}`,
        headers: authHeaders(adminUser),
        payload: { username: "updatedusername" },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().code).toBe("auth.username_immutable");
    });

    it("should return 403 without users.write permission", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${regularUser.id}`,
        headers: authHeaders(regularUser),
        payload: { username: "updatedusername" },
      });
      expect(response.statusCode).toBe(403);
    });

    it("should return 404 if user not found", async () => {
      vi.spyOn(UserManagementService, "updateUser").mockRejectedValue(
        new NotFoundError("user.not_found"),
      );

      const response = await app.inject({
        method: "PATCH",
        url: "/api/users/nonexistent-id",
        headers: authHeaders(adminUser),
        payload: { enabled: true },
      });
      expect(response.statusCode).toBe(404);
      expect(response.json().code).toBe("user.not_found");
    });

    it("should return 400 if no fields to update", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${regularUser.id}`,
        headers: authHeaders(adminUser),
        payload: {},
      });
      expect(response.statusCode).toBe(400);
    });

    it("should not log password in audit details when password is in payload", async () => {
      vi.spyOn(UserManagementService, "updateUser").mockResolvedValue(
        makeUserRecord({ id: regularUser.id, username: "Weidong" }),
      );
      const emitAudit = vi
        .spyOn(auditLogEmit, "emitAuditLogFromRequestSafe")
        .mockResolvedValue(undefined);

      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${regularUser.id}`,
        headers: authHeaders(adminUser),
        payload: {
          enabled: true,
          password: "Dong123456",
        },
      });

      expect(response.statusCode).toBe(200);
      expect(emitAudit).toHaveBeenCalledWith(
        app.events,
        app.log,
        expect.anything(),
        {
          userId: adminUser.id,
          username: adminUser.username,
          action: AuditAction.USER_UPDATE,
          resource: "user:Weidong",
          detail_key: "user.audit.updated",
          detail_params: {
            username: "Weidong",
            is_system_admin: undefined,
            enabled: true,
            role_ids: undefined,
          },
        },
      );
    });
  });

  describe("DELETE /api/users/:id", () => {
    it("should delete a user with users.delete permission", async () => {
      vi.spyOn(UserManagementService, "getUserByIdAdmin").mockResolvedValue(
        makeUserRecord({ id: "some-other-id", username: "deleteduser" }),
      );
      const deleteUser = vi
        .spyOn(UserManagementService, "deleteUser")
        .mockResolvedValue(undefined);

      const response = await app.inject({
        method: "DELETE",
        url: "/api/users/some-other-id",
        headers: authHeaders(adminUser),
      });

      expect(response.statusCode).toBe(200);
      expect(deleteUser).toHaveBeenCalledWith(
        DEFAULT_TENANT_ID,
        "some-other-id",
      );
    });

    it("should return 403 without users.delete permission", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: `/api/users/${regularUser.id}`,
        headers: authHeaders(regularUser),
      });
      expect(response.statusCode).toBe(403);
    });

    it("should return 400 if trying to delete self", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: `/api/users/${adminUser.id}`,
        headers: authHeaders(adminUser),
      });
      expect(response.statusCode).toBe(400);
    });

    it("should return 404 if user not found", async () => {
      vi.spyOn(UserManagementService, "getUserByIdAdmin").mockRejectedValue(
        new NotFoundError("user.not_found"),
      );

      const response = await app.inject({
        method: "DELETE",
        url: "/api/users/nonexistent-id",
        headers: authHeaders(adminUser),
      });
      expect(response.statusCode).toBe(404);
      expect(response.json().code).toBe("user.not_found");
    });
  });

  describe("POST /api/users/:id/reset-password", () => {
    it("should reset user password with users.write permission", async () => {
      vi.spyOn(UserManagementService, "getUserByIdAdmin").mockResolvedValue(
        makeUserRecord({ id: regularUser.id, username: regularUser.username }),
      );
      vi.spyOn(UserManagementService, "resetPassword").mockResolvedValue({
        password: "newpassword123",
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/users/${regularUser.id}/reset-password`,
        headers: authHeaders(adminUser),
        payload: { newPassword: "newpassword123" },
      });

      expect(response.statusCode).toBe(200);
      const { data } = JSON.parse(response.payload);
      expect(data).toHaveProperty("password", "newpassword123");
    });

    it("should return 403 without users.write permission", async () => {
      await grantPermission(app, regularUser.id, "users.read");

      const response = await app.inject({
        method: "POST",
        url: `/api/users/${adminUser.id}/reset-password`,
        headers: authHeaders(regularUser),
        payload: { newPassword: "newpassword123" },
      });
      expect(response.statusCode).toBe(403);
    });

    it("should return 400 if newPassword is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/users/${regularUser.id}/reset-password`,
        headers: authHeaders(adminUser),
        payload: {},
      });
      expect(response.statusCode).toBe(400);
    });

    it("should return 400 if newPassword is too short", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/users/${regularUser.id}/reset-password`,
        headers: authHeaders(adminUser),
        payload: { newPassword: "12345" },
      });
      expect(response.statusCode).toBe(400);
    });

    it("should return 404 if user not found", async () => {
      vi.spyOn(UserManagementService, "resetPassword").mockRejectedValue(
        new NotFoundError("user.not_found"),
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/users/nonexistent-id/reset-password",
        headers: authHeaders(adminUser),
        payload: { newPassword: "newpassword123" },
      });
      expect(response.statusCode).toBe(404);
      expect(response.json().code).toBe("user.not_found");
    });
  });
});
