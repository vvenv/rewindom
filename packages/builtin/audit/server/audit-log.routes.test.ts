import { AuditScope } from "../shared/index.js";

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

vi.mock("./audit.service.js", () => ({
  AuditService: {
    getAuditLogs: vi.fn().mockResolvedValue([]),
    getAuditLogsCount: vi.fn().mockResolvedValue(0),
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

import {
  createRouteTestApp,
  createTestUserFast,
  grantPermission,
  resetUserPermissions,
  type TestApp,
  type TestUser,
} from "@be-water/server-test";
import { installTestPermissionCatalog } from "@be-water/server-test/permission-catalog";

import { auditLogRoutes } from "./audit-log.routes.js";

installTestPermissionCatalog([
  { key: "audit_logs.read", label: "查看审计日志", group: "系统监控" },
]);

describe("Audit Log Routes", () => {
  let app: TestApp;
  let adminUser: TestUser;
  let regularUser: TestUser;

  beforeAll(async () => {
    app = await createRouteTestApp(async (instance) => {
      await instance.register(auditLogRoutes, { prefix: "/api/audit-logs" });
    });
    adminUser = await createTestUserFast(app, "admin", "password123", {
      is_system_admin: true,
    });
    regularUser = await createTestUserFast(app, "regular", "password123");
  });

  // 这些断言用 toHaveBeenCalledWith，它匹配「曾经的任意一次调用」——
  // 不逐个清空的话，前一个用例的调用会让后一个用例假通过。
  beforeEach(async () => {
    vi.clearAllMocks();
    await resetUserPermissions(app, regularUser.id);
  });

  afterAll(async () => {
    await app.close();
  });

  function authHeaders(user: TestUser) {
    return { authorization: `Bearer ${user.accessToken}` };
  }

  describe("GET /api/audit-logs", () => {
    it("should get audit logs for authenticated user", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/audit-logs",
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
        url: "/api/audit-logs",
      });
      expect(response.statusCode).toBe(401);
    });

    it("should support pagination", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/audit-logs?page=1&page_size=10",
        headers: authHeaders(adminUser),
      });

      expect(response.statusCode).toBe(200);
      const { data } = JSON.parse(response.payload);
      expect(data.page).toBe(1);
      expect(data.page_size).toBe(10);
    });

    it("should filter by action", async () => {
      const { AuditService } = await import("./audit.service.js");
      const response = await app.inject({
        method: "GET",
        url: "/api/audit-logs?action=USER_CREATE",
        headers: authHeaders(adminUser),
      });

      expect(response.statusCode).toBe(200);
      expect(AuditService.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ action: "USER_CREATE" }),
      );
    });

    it("should filter by date range", async () => {
      const { AuditService } = await import("./audit.service.js");
      const response = await app.inject({
        method: "GET",
        url: "/api/audit-logs?start_date=2024-01-01&end_date=2024-12-31",
        headers: authHeaders(adminUser),
      });

      expect(response.statusCode).toBe(200);
      expect(AuditService.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: "2024-01-01",
          endDate: "2024-12-31",
        }),
      );
    });

    it("should pass through sorting", async () => {
      const { AuditService } = await import("./audit.service.js");
      const response = await app.inject({
        method: "GET",
        url: "/api/audit-logs?sort_by=action&sort_dir=asc",
        headers: authHeaders(adminUser),
      });

      expect(response.statusCode).toBe(200);
      expect(AuditService.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ sort_by: "action", sort_dir: "asc" }),
      );
    });

    it("should ignore an invalid sort_dir", async () => {
      const { AuditService } = await import("./audit.service.js");
      const response = await app.inject({
        method: "GET",
        url: "/api/audit-logs?sort_dir=sideways",
        headers: authHeaders(adminUser),
      });

      expect(response.statusCode).toBe(200);
      expect(AuditService.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ sort_dir: undefined }),
      );
    });

    it("should let a system admin read tenant-wide and filter by user_id", async () => {
      const { AuditService } = await import("./audit.service.js");
      const response = await app.inject({
        method: "GET",
        url: `/api/audit-logs?user_id=${regularUser.id}`,
        headers: authHeaders(adminUser),
      });

      expect(response.statusCode).toBe(200);
      expect(AuditService.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: regularUser.id,
          tenantSlug: DEFAULT_TENANT_SLUG,
          scope: AuditScope.TENANT,
        }),
      );
    });

    it("should let audit_logs.read read tenant-wide", async () => {
      const { AuditService } = await import("./audit.service.js");
      await grantPermission(app, regularUser.id, "audit_logs.read");

      const response = await app.inject({
        method: "GET",
        url: `/api/audit-logs?user_id=${adminUser.id}&username=admin`,
        headers: authHeaders(regularUser),
      });

      expect(response.statusCode).toBe(200);
      expect(AuditService.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: adminUser.id,
          username: "admin",
          tenantSlug: DEFAULT_TENANT_SLUG,
          scope: AuditScope.TENANT,
        }),
      );
    });

    it("should scope a member without audit_logs.read to their own logs", async () => {
      const { AuditService } = await import("./audit.service.js");
      const response = await app.inject({
        method: "GET",
        url: `/api/audit-logs?user_id=${adminUser.id}&username=admin`,
        headers: authHeaders(regularUser),
      });

      expect(response.statusCode).toBe(200);
      // 请求里的 user_id / username 都被忽略，强制收敛到本人
      expect(AuditService.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: regularUser.id,
          username: undefined,
          tenantSlug: DEFAULT_TENANT_SLUG,
          scope: AuditScope.TENANT,
        }),
      );
    });

    it("should scope superuser to current tenant logs", async () => {
      const { AuditService } = await import("./audit.service.js");
      const response = await app.inject({
        method: "GET",
        url: "/api/audit-logs",
        headers: authHeaders(adminUser),
      });

      expect(response.statusCode).toBe(200);
      expect(AuditService.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantSlug: DEFAULT_TENANT_SLUG,
          scope: AuditScope.TENANT,
        }),
      );
      expect(AuditService.getAuditLogsCount).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantSlug: DEFAULT_TENANT_SLUG,
          scope: AuditScope.TENANT,
        }),
      );
      const { data } = JSON.parse(response.payload);
      expect(data.items).toBeDefined();
    });
  });
});
