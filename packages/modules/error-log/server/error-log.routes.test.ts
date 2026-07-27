import { DEFAULT_TENANT_SLUG } from "@be-water/shared";
import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
  vi,
} from "vitest";

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

vi.mock("./error.service.js", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ErrorService: Object.assign(
      actual.ErrorService as Record<string, unknown>,
      {
        getErrorLogs: vi.fn().mockResolvedValue([]),
        getErrorLogsCount: vi.fn().mockResolvedValue(0),
        getErrorStats: vi.fn().mockResolvedValue({ total: 0, byLevel: {} }),
        cleanupOldLogs: vi.fn().mockResolvedValue(0),
        getErrorLogById: vi.fn().mockResolvedValue(null),
        deleteErrorLog: vi.fn().mockResolvedValue(undefined),
        logError: vi.fn().mockResolvedValue(undefined),
      },
    ),
  };
});

import {
  createRouteTestApp,
  createTestUserFast,
  type TestApp,
  type TestUser,
} from "@be-water/server-test";
import { installTestPermissionCatalog } from "@be-water/server-test/permission-catalog";

import { AuditAction } from "../../audit/shared/index.js";

import { errorLogRoutes } from "./error-log.routes.js";

installTestPermissionCatalog([
  { key: "error_logs.read", label: "查看错误日志", group: "错误日志" },
  { key: "error_logs.manage", label: "管理错误日志", group: "错误日志" },
]);

describe("Error Log Routes", () => {
  let app: TestApp;
  let adminUser: TestUser;
  let regularUser: TestUser;

  beforeAll(async () => {
    app = await createRouteTestApp(async (instance) => {
      await instance.register(errorLogRoutes, { prefix: "/api/error-logs" });
    });
    adminUser = await createTestUserFast(app, "admin", "password123", {
      is_system_admin: true,
    });
    regularUser = await createTestUserFast(app, "regular", "password123");
  });

  afterAll(async () => {
    await app.close();
  });

  function authHeaders(user: TestUser) {
    return { authorization: `Bearer ${user.accessToken}` };
  }

  describe("GET /api/error-logs", () => {
    it("should get error logs for authenticated user", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/error-logs",
        headers: authHeaders(regularUser),
      });

      expect(response.statusCode).toBe(200);
      const { data } = JSON.parse(response.payload);
      expect(data).toHaveProperty("items");
      expect(data).toHaveProperty("total");
      expect(Array.isArray(data.items)).toBe(true);
    });

    it("should return 401 without authentication", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/error-logs",
      });
      expect(response.statusCode).toBe(401);
    });

    it("should support pagination", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/error-logs?page=1&page_size=10",
        headers: authHeaders(adminUser),
      });

      expect(response.statusCode).toBe(200);
      const { data } = JSON.parse(response.payload);
      expect(data.page).toBe(1);
      expect(data.page_size).toBe(10);
    });

    it("should pass through level / q filters", async () => {
      const { ErrorService } = await import("./error.service.js");
      const response = await app.inject({
        method: "GET",
        url: "/api/error-logs?level=error&q=TEST_ERROR",
        headers: authHeaders(adminUser),
      });

      expect(response.statusCode).toBe(200);
      expect(ErrorService.getErrorLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "error",
          q: "TEST_ERROR",
        }),
      );
    });

    it("should allow superuser to filter by user_id", async () => {
      const { ErrorService } = await import("./error.service.js");
      const response = await app.inject({
        method: "GET",
        url: `/api/error-logs?user_id=${regularUser.id}`,
        headers: authHeaders(adminUser),
      });

      expect(response.statusCode).toBe(200);
      expect(ErrorService.getErrorLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: regularUser.id,
          tenantSlug: DEFAULT_TENANT_SLUG,
        }),
      );
    });

    it("should scope regular user to their own logs", async () => {
      const { ErrorService } = await import("./error.service.js");
      const response = await app.inject({
        method: "GET",
        url: `/api/error-logs?user_id=${adminUser.id}`,
        headers: authHeaders(regularUser),
      });

      expect(response.statusCode).toBe(200);
      expect(ErrorService.getErrorLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: regularUser.id,
          tenantSlug: DEFAULT_TENANT_SLUG,
        }),
      );
    });

    it("should scope superuser to current tenant logs", async () => {
      const { ErrorService } = await import("./error.service.js");
      const response = await app.inject({
        method: "GET",
        url: "/api/error-logs",
        headers: authHeaders(adminUser),
      });

      expect(response.statusCode).toBe(200);
      expect(ErrorService.getErrorLogs).toHaveBeenCalledWith(
        expect.objectContaining({ tenantSlug: DEFAULT_TENANT_SLUG }),
      );
      expect(ErrorService.getErrorLogsCount).toHaveBeenCalledWith(
        expect.objectContaining({ tenantSlug: DEFAULT_TENANT_SLUG }),
      );
    });
  });

  describe("GET /api/error-logs/stats", () => {
    it("should get error stats for superuser", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/error-logs/stats",
        headers: authHeaders(adminUser),
      });

      expect(response.statusCode).toBe(200);
      const { data } = JSON.parse(response.payload);
      expect(data).toBeDefined();
    });

    it("should return 403 for regular user", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/error-logs/stats",
        headers: authHeaders(regularUser),
      });
      expect(response.statusCode).toBe(403);
    });
  });

  describe("DELETE /api/error-logs/cleanup", () => {
    it("should cleanup old logs for superuser", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/error-logs/cleanup?days=30",
        headers: authHeaders(adminUser),
      });

      expect(response.statusCode).toBe(200);
      const { data } = JSON.parse(response.payload);
      expect(data).toHaveProperty("deletedCount");
    });

    it("should return 403 for regular user", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/error-logs/cleanup?days=30",
        headers: authHeaders(regularUser),
      });
      expect(response.statusCode).toBe(403);
    });
  });

  describe("DELETE /api/error-logs/cleanup/my", () => {
    it("should cleanup my old logs for authenticated user", async () => {
      const { ErrorService } = await import("./error.service.js");
      const response = await app.inject({
        method: "DELETE",
        url: "/api/error-logs/cleanup/my?days=30",
        headers: authHeaders(regularUser),
      });

      expect(response.statusCode).toBe(200);
      const { data } = JSON.parse(response.payload);
      expect(data).toHaveProperty("deletedCount");
      expect(ErrorService.cleanupOldLogs).toHaveBeenCalledWith(
        30,
        regularUser.id,
        DEFAULT_TENANT_SLUG,
      );
    });

    it("should return 401 without authentication", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/error-logs/cleanup/my?days=30",
      });
      expect(response.statusCode).toBe(401);
    });
  });

  describe("DELETE /api/error-logs/:id", () => {
    it("should return 404 if log not found", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/error-logs/nonexistent-id",
        headers: authHeaders(adminUser),
      });
      expect(response.statusCode).toBe(404);
    });

    it("should return 403 when deleting another user's log", async () => {
      const { ErrorService } = await import("./error.service.js");
      vi.mocked(ErrorService.getErrorLogById).mockResolvedValueOnce({
        id: "log-1",
        user_id: "someone-else",
        tenant_slug: null,
      } as never);

      const response = await app.inject({
        method: "DELETE",
        url: "/api/error-logs/log-1",
        headers: authHeaders(regularUser),
      });
      expect(response.statusCode).toBe(403);
    });

    it("should delete own log", async () => {
      const { ErrorService } = await import("./error.service.js");
      vi.mocked(ErrorService.getErrorLogById).mockResolvedValueOnce({
        id: "log-1",
        user_id: regularUser.id,
        tenant_slug: null,
      } as never);

      const response = await app.inject({
        method: "DELETE",
        url: "/api/error-logs/log-1",
        headers: authHeaders(regularUser),
      });

      expect(response.statusCode).toBe(200);
      expect(ErrorService.deleteErrorLog).toHaveBeenCalledWith(
        "log-1",
        DEFAULT_TENANT_SLUG,
      );
    });

    it("should return 401 without authentication", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/error-logs/test-id",
      });
      expect(response.statusCode).toBe(401);
    });
  });

  // 删日志本身带有「抹痕迹」的意味，必须自己留下痕迹。
  describe("错误日志删除的审计日志", () => {
    beforeEach(() => {
      auditEmit.emitAuditLogFromRequestSafe.mockClear();
    });

    function lastAuditInput() {
      const calls = auditEmit.emitAuditLogFromRequestSafe.mock.calls;
      expect(calls.length).toBe(1);
      return calls[0][3] as { action: string; resource: string };
    }

    it("按租户清理写入 ERROR_LOG_CLEANUP", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/error-logs/cleanup?days=30",
        headers: authHeaders(adminUser),
      });

      expect(response.statusCode).toBe(200);
      expect(lastAuditInput()).toMatchObject({
        action: AuditAction.ERROR_LOG_CLEANUP,
        resource: "error_log:tenant",
      });
    });

    it("清理本人日志写入 ERROR_LOG_CLEANUP，resource 指向本人", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/error-logs/cleanup/my?days=30",
        headers: authHeaders(regularUser),
      });

      expect(response.statusCode).toBe(200);
      expect(lastAuditInput()).toMatchObject({
        action: AuditAction.ERROR_LOG_CLEANUP,
        resource: `error_log:user:${regularUser.id}`,
      });
    });

    it("删除单条写入 ERROR_LOG_DELETE", async () => {
      const { ErrorService } = await import("./error.service.js");
      vi.mocked(ErrorService.getErrorLogById).mockResolvedValueOnce({
        id: "log-1",
        user_id: regularUser.id,
        tenant_slug: null,
      } as never);

      const response = await app.inject({
        method: "DELETE",
        url: "/api/error-logs/log-1",
        headers: authHeaders(regularUser),
      });

      expect(response.statusCode).toBe(200);
      expect(lastAuditInput()).toMatchObject({
        action: AuditAction.ERROR_LOG_DELETE,
        resource: "error_log:log-1",
      });
    });

    it("越权删除被拒时不写审计", async () => {
      const { ErrorService } = await import("./error.service.js");
      vi.mocked(ErrorService.getErrorLogById).mockResolvedValueOnce({
        id: "log-1",
        user_id: "someone-else",
        tenant_slug: null,
      } as never);

      const response = await app.inject({
        method: "DELETE",
        url: "/api/error-logs/log-1",
        headers: authHeaders(regularUser),
      });

      expect(response.statusCode).toBe(403);
      expect(auditEmit.emitAuditLogFromRequestSafe).not.toHaveBeenCalled();
    });
  });
});
