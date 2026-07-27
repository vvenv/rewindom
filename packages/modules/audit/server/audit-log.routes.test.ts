import { AuditScope } from "../shared/index.js";

import { DEFAULT_TENANT_SLUG } from "@be-water/shared";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

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
  type TestApp,
  type TestUser,
} from "@be-water/server-test";

import { auditLogRoutes } from "./audit-log.routes.js";

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
      const response = await app.inject({
        method: "GET",
        url: "/api/audit-logs?action=USER_CREATE",
        headers: authHeaders(adminUser),
      });
      expect(response.statusCode).toBe(200);
    });

    it("should filter by username", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/audit-logs?username=${adminUser.username}`,
        headers: authHeaders(adminUser),
      });
      expect(response.statusCode).toBe(200);
    });

    it("should filter by date range", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/audit-logs?start_date=2024-01-01&end_date=2024-12-31",
        headers: authHeaders(adminUser),
      });
      expect(response.statusCode).toBe(200);
    });

    it("should allow superuser to filter by user_id", async () => {
      const { AuditService } =
        await import("./audit.service.js");
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

    it("should scope regular user to their own logs", async () => {
      const { AuditService } =
        await import("./audit.service.js");
      const response = await app.inject({
        method: "GET",
        url: `/api/audit-logs?user_id=${adminUser.id}`,
        headers: authHeaders(regularUser),
      });

      expect(response.statusCode).toBe(200);
      // The requested user_id is ignored; the regular user's own id is enforced.
      expect(AuditService.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: regularUser.id,
          tenantSlug: DEFAULT_TENANT_SLUG,
          scope: AuditScope.TENANT,
        }),
      );
    });

    it("should scope superuser to current tenant logs", async () => {
      const { AuditService } =
        await import("./audit.service.js");
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
