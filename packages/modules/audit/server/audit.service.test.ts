import {
  registerServerI18nBundles,
  resetServerI18nCatalogsForTests,
} from "@be-water/server-kernel/lib/i18n/registry.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import {
  PLATFORM_ADMIN_USER_ID,
  TENANT_IMPERSONATION_USERNAME,
} from "@be-water/shared";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { NOTES_SERVER_I18N } from "../../notes/server/i18n.js";
import { AuditAction, AuditScope } from "../shared/index.js";

import { AuditService } from "./audit.service.js";

interface MockAuditLogRow {
  id: string;
  user_id: string | null;
  username: string;
  tenant_slug: string | null;
  scope: string;
  action: string;
  resource: string | null;
  details: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

// Mock prisma
vi.mock("@be-water/server-kernel/lib/prisma.js", () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

describe("AuditService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetServerI18nCatalogsForTests();
    registerServerI18nBundles([NOTES_SERVER_I18N]);
  });

  describe("log", () => {
    it("should create an audit log entry with all fields", async () => {
      const input = {
        userId: "user-123",
        username: "testuser",
        tenant_slug: "acme",
        action: AuditAction.LOGIN,
        resource: "auth",
        details: "用户成功登录",
        ipAddress: "127.0.0.1",
        userAgent: "Mozilla/5.0",
      };

      await AuditService.log(input);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          user_id: "user-123",
          username: "testuser",
          tenant_slug: "acme",
          scope: AuditScope.TENANT,
          action: AuditAction.LOGIN,
          resource: "auth",
          details: "用户成功登录",
          detail_key: null,
          detail_params: undefined,
          ip_address: "127.0.0.1",
          user_agent: "Mozilla/5.0",
        },
      });
    });

    it("should omit user_id for platform admin synthetic user id", async () => {
      const input = {
        userId: PLATFORM_ADMIN_USER_ID,
        username: "platform-admin",
        action: AuditAction.LOGIN,
        resource: "auth",
        details: "用户成功登录",
      };

      await AuditService.log(input);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          username: "platform-admin",
          scope: AuditScope.PLATFORM,
          action: AuditAction.LOGIN,
          resource: "auth",
          details: "用户成功登录",
          detail_key: null,
          detail_params: undefined,
        },
      });
    });

    it("should mark platform-only actions as platform scope", async () => {
      await AuditService.log({
        username: "platform-admin",
        action: AuditAction.TENANT_IMPERSONATE,
        resource: "tenant",
        details: "slug=acme",
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          scope: AuditScope.PLATFORM,
          action: AuditAction.TENANT_IMPERSONATE,
        }),
      });
    });

    it("should mark impersonation shadow user actions as platform scope", async () => {
      await AuditService.log({
        userId: "shadow-user",
        username: TENANT_IMPERSONATION_USERNAME,
        action: AuditAction.USER_CREATE,
        resource: "user:1",
        tenant_slug: "acme",
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          user_id: "shadow-user",
          tenant_slug: "acme",
          scope: AuditScope.PLATFORM,
          action: AuditAction.USER_CREATE,
        }),
      });
    });

    it("should treat missing tenant_slug as platform scope", async () => {
      const input = {
        username: "testuser",
        action: AuditAction.LOGIN,
        resource: "auth",
        details: "用户成功登录",
      };

      await AuditService.log(input);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          username: "testuser",
          scope: AuditScope.PLATFORM,
          action: AuditAction.LOGIN,
          resource: "auth",
          details: "用户成功登录",
          detail_key: null,
          detail_params: undefined,
        },
      });
    });

    it("should create an audit log entry with minimal fields", async () => {
      const input = {
        username: "testuser",
        tenant_slug: "acme",
        action: AuditAction.LOGIN,
      };

      await AuditService.log(input);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          username: "testuser",
          tenant_slug: "acme",
          scope: AuditScope.TENANT,
          action: AuditAction.LOGIN,
          detail_key: null,
          detail_params: undefined,
        },
      });
    });

    it("should store detail_key + params and denormalize zh-CN into details", async () => {
      await AuditService.log({
        username: "testuser",
        tenant_slug: "acme",
        action: AuditAction.NOTE_CREATE,
        resource: "note:1",
        detail_key: "notes.audit.created",
        detail_params: { title: "hello" },
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          detail_key: "notes.audit.created",
          details: "创建笔记：hello",
        }),
      });
      const data = vi.mocked(prisma.auditLog.create).mock.calls[0]?.[0]?.data as {
        detail_params?: unknown;
      };
      expect(data.detail_params).toBeDefined();
    });
  });

  describe("getUserAuditLogs", () => {
    it("should get audit logs for a user with default limit", async () => {
      const mockLogs: Array<{
        id: string;
        action: string;
        resource: string;
        details: string;
        ip_address: string;
        user_agent: string;
        created_at: Date;
      }> = [
        {
          id: "1",
          action: "LOGIN",
          resource: "auth",
          details: "用户成功登录",
          ip_address: "127.0.0.1",
          user_agent: "Mozilla",
          created_at: new Date(),
        },
      ];

      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockLogs as never);

      const result = await AuditService.getUserAuditLogs("user-123", "default");

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          AND: [{ user_id: "user-123" }, { tenant_slug: "default" }],
        },
        orderBy: { created_at: "desc" },
        take: 100,
        select: {
          id: true,
          action: true,
          resource: true,
          details: true,
          ip_address: true,
          user_agent: true,
          created_at: true,
        },
      });
      expect(result).toEqual(mockLogs);
    });

    it("should get audit logs for a user with custom limit", async () => {
      const mockLogs: MockAuditLogRow[] = [];
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockLogs);

      await AuditService.getUserAuditLogs("user-123", "acme", 50);

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          AND: [{ user_id: "user-123" }, { tenant_slug: "acme" }],
        },
        orderBy: { created_at: "desc" },
        take: 50,
        select: {
          id: true,
          action: true,
          resource: true,
          details: true,
          ip_address: true,
          user_agent: true,
          created_at: true,
        },
      });
    });
  });

  describe("getAuditLogsByAction", () => {
    it("should get audit logs by action", async () => {
      const mockLogs: MockAuditLogRow[] = [];
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockLogs);

      await AuditService.getAuditLogsByAction(AuditAction.LOGIN, "acme");

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          AND: [{ action: AuditAction.LOGIN }, { tenant_slug: "acme" }],
        },
        orderBy: { created_at: "desc" },
        take: 100,
        select: {
          id: true,
          user_id: true,
          username: true,
          action: true,
          resource: true,
          details: true,
          ip_address: true,
          user_agent: true,
          created_at: true,
        },
      });
    });
  });

  describe("getAuditLogsByUsername", () => {
    it("should get audit logs by username", async () => {
      const mockLogs: MockAuditLogRow[] = [];
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockLogs);

      await AuditService.getAuditLogsByUsername("testuser", "acme");

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            { username: { contains: "testuser" } },
            { tenant_slug: "acme" },
          ],
        },
        orderBy: { created_at: "desc" },
        take: 100,
        select: {
          id: true,
          user_id: true,
          username: true,
          action: true,
          resource: true,
          details: true,
          ip_address: true,
          user_agent: true,
          created_at: true,
        },
      });
    });
  });

  describe("getAuditLogs", () => {
    it("should get audit logs with combined filters", async () => {
      const mockLogs: MockAuditLogRow[] = [];
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockLogs);

      await AuditService.getAuditLogs({
        action: AuditAction.LOGIN,
        username: "testuser",
        userId: "user-123",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        skip: 10,
        take: 20,
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            { action: AuditAction.LOGIN },
            { username: { contains: "testuser" } },
            { user_id: "user-123" },
            {
              created_at: {
                gte: new Date("2024-01-01T00:00:00.000Z"),
                lte: new Date("2024-12-31T23:59:59.999Z"),
              },
            },
          ],
        },
        orderBy: { created_at: "desc" },
        take: 20,
        skip: 10,
        select: {
          id: true,
          user_id: true,
          username: true,
          action: true,
          resource: true,
          details: true,
          detail_key: true,
          detail_params: true,
          ip_address: true,
          user_agent: true,
          created_at: true,
        },
      });
    });

    it("should handle date strings with time component", async () => {
      const mockLogs: MockAuditLogRow[] = [];
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockLogs);

      await AuditService.getAuditLogs({
        startDate: "2024-01-01 10:00:00",
        endDate: "2024-12-31 23:59:59",
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              created_at: {
                gte: new Date("2024-01-01 10:00:00"),
                lte: new Date("2024-12-31 23:59:59"),
              },
            },
          ],
        },
        orderBy: { created_at: "desc" },
        take: 20,
        skip: 0,
        select: {
          id: true,
          user_id: true,
          username: true,
          action: true,
          resource: true,
          details: true,
          detail_key: true,
          detail_params: true,
          ip_address: true,
          user_agent: true,
          created_at: true,
        },
      });
    });
  });

  describe("getAuditLogsCount", () => {
    it("should get audit logs count with filters", async () => {
      vi.mocked(prisma.auditLog.count).mockResolvedValue(100);

      const result = await AuditService.getAuditLogsCount({
        action: AuditAction.LOGIN,
        username: "testuser",
        userId: "user-123",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });

      expect(prisma.auditLog.count).toHaveBeenCalledWith({
        where: {
          AND: [
            { action: AuditAction.LOGIN },
            { username: { contains: "testuser" } },
            { user_id: "user-123" },
            {
              created_at: {
                gte: new Date("2024-01-01T00:00:00.000Z"),
                lte: new Date("2024-12-31T23:59:59.999Z"),
              },
            },
          ],
        },
      });
      expect(result).toBe(100);
    });

    it("should get audit logs count without filters", async () => {
      vi.mocked(prisma.auditLog.count).mockResolvedValue(200);

      const result = await AuditService.getAuditLogsCount();

      expect(prisma.auditLog.count).toHaveBeenCalledWith({
        where: { AND: [] },
      });
      expect(result).toBe(200);
    });

    it("should filter by tenant slug", async () => {
      vi.mocked(prisma.auditLog.count).mockResolvedValue(5);

      await AuditService.getAuditLogsCount({ tenantSlug: "acme" });

      expect(prisma.auditLog.count).toHaveBeenCalledWith({
        where: {
          AND: [{ tenant_slug: "acme" }],
        },
      });
    });

    it("should filter default tenant by exact slug only", async () => {
      vi.mocked(prisma.auditLog.count).mockResolvedValue(5);

      await AuditService.getAuditLogsCount({ tenantSlug: "default" });

      expect(prisma.auditLog.count).toHaveBeenCalledWith({
        where: {
          AND: [{ tenant_slug: "default" }],
        },
      });
    });
  });
});
