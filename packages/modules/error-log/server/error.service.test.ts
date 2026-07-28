import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { type JsonValue } from "@be-water/shared";
import { describe, it, expect, beforeEach, vi } from "vitest";


import { ErrorService } from "./error.service.js";

// Mock prisma
vi.mock("@be-water/server-kernel/lib/prisma.js", () => ({
  prisma: {
    errorLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

describe("ErrorService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("log", () => {
    it("should create an error log entry with all fields", async () => {
      const input = {
        level: "error" as const,
        message: "Test error",
        stackTrace: "Error stack trace",
        userId: "user-123",
        username: "testuser",
        route: "/api/test",
        method: "POST",
        ipAddress: "127.0.0.1",
        userAgent: "Mozilla/5.0",
        requestBody: { test: "data" },
        requestParams: '{"id": "123"}',
        requestQuery: '{"page": "1"}',
        errorCode: "ERR_001",
        context: { key: "value" },
      };

      await ErrorService.log(input);

      expect(prisma.errorLog.create).toHaveBeenCalledWith({
        data: {
          level: "error",
          message: "Test error",
          stack_trace: "Error stack trace",
          user_id: "user-123",
          username: "testuser",
          route: "/api/test",
          method: "POST",
          ip_address: "127.0.0.1",
          user_agent: "Mozilla/5.0",
          request_body: { test: "data" },
          request_params: '{"id": "123"}',
          request_query: '{"page": "1"}',
          error_code: "ERR_001",
          context: '{"key":"value"}',
        },
      });
    });

    it("should create an error log entry with minimal fields", async () => {
      const input = {
        level: "info" as const,
        message: "Test info",
      };

      await ErrorService.log(input);

      expect(prisma.errorLog.create).toHaveBeenCalledWith({
        data: {
          level: "info",
          message: "Test info",
          stack_trace: undefined,
          user_id: undefined,
          username: undefined,
          route: undefined,
          method: undefined,
          ip_address: undefined,
          user_agent: undefined,
          request_body: undefined,
          request_params: undefined,
          request_query: undefined,
          error_code: undefined,
          context: null,
        },
      });
    });

    it("should handle null context", async () => {
      const input = {
        level: "warn" as const,
        message: "Test warning",
        context: undefined,
      };

      await ErrorService.log(input);

      expect(prisma.errorLog.create).toHaveBeenCalled();
      const callArgs = vi.mocked(prisma.errorLog.create).mock.calls[0];
      expect(callArgs[0].data.level).toBe("warn");
      expect(callArgs[0].data.message).toBe("Test warning");
      expect(callArgs[0].data.context).toBeNull();
    });
  });

  describe("logError", () => {
    it("should log an error with full context", async () => {
      const error = new Error("Test error");
      error.stack = "Error stack trace";

      await ErrorService.logError(error, {
        userId: "user-123",
        username: "testuser",
        route: "/api/test",
        method: "POST",
        ipAddress: "127.0.0.1",
        userAgent: "Mozilla/5.0",
        requestBody: { test: "data" },
        requestParams: '{"id": "123"}',
        requestQuery: '{"page": "1"}',
        errorCode: "ERR_001",
        additionalContext: { key: "value" },
      });

      expect(prisma.errorLog.create).toHaveBeenCalledWith({
        data: {
          level: "error",
          message: "Test error",
          stack_trace: "Error stack trace",
          user_id: "user-123",
          username: "testuser",
          route: "/api/test",
          method: "POST",
          ip_address: "127.0.0.1",
          user_agent: "Mozilla/5.0",
          request_body: { test: "data" },
          request_params: '{"id": "123"}',
          request_query: '{"page": "1"}',
          error_code: "ERR_001",
          context: '{"key":"value"}',
        },
      });
    });

    it("should log an error with minimal context", async () => {
      const error = new Error("Test error");

      await ErrorService.logError(error);

      expect(prisma.errorLog.create).toHaveBeenCalledWith({
        data: {
          level: "error",
          message: "Test error",
          stack_trace: error.stack,
          context: null,
          error_code: undefined,
          ip_address: undefined,
          method: undefined,
          request_body: undefined,
          request_params: undefined,
          request_query: undefined,
          route: undefined,
          user_agent: undefined,
          user_id: undefined,
          username: undefined,
        },
      });
    });
  });

  describe("logWarning", () => {
    it("should log a warning with context", async () => {
      await ErrorService.logWarning("Test warning", {
        userId: "user-123",
        username: "testuser",
        route: "/api/test",
        method: "POST",
        ipAddress: "127.0.0.1",
        userAgent: "Mozilla/5.0",
        additionalContext: { key: "value" },
      });

      expect(prisma.errorLog.create).toHaveBeenCalledWith({
        data: {
          level: "warn",
          message: "Test warning",
          user_id: "user-123",
          username: "testuser",
          route: "/api/test",
          method: "POST",
          ip_address: "127.0.0.1",
          user_agent: "Mozilla/5.0",
          context: '{"key":"value"}',
          stack_trace: undefined,
          error_code: undefined,
          request_body: undefined,
          request_params: undefined,
          request_query: undefined,
        },
      });
    });

    it("should log a warning without context", async () => {
      await ErrorService.logWarning("Test warning");

      expect(prisma.errorLog.create).toHaveBeenCalledWith({
        data: {
          level: "warn",
          message: "Test warning",
          stack_trace: undefined,
          user_id: undefined,
          username: undefined,
          route: undefined,
          method: undefined,
          ip_address: undefined,
          user_agent: undefined,
          request_body: undefined,
          request_params: undefined,
          request_query: undefined,
          error_code: undefined,
          context: null,
        },
      });
    });
  });

  describe("logInfo", () => {
    it("should log an info message with context", async () => {
      await ErrorService.logInfo("Test info", {
        userId: "user-123",
        username: "testuser",
        route: "/api/test",
        method: "POST",
        additionalContext: { key: "value" },
      });

      expect(prisma.errorLog.create).toHaveBeenCalledWith({
        data: {
          level: "info",
          message: "Test info",
          user_id: "user-123",
          username: "testuser",
          route: "/api/test",
          method: "POST",
          context: '{"key":"value"}',
          stack_trace: undefined,
          ip_address: undefined,
          user_agent: undefined,
          request_body: undefined,
          request_params: undefined,
          request_query: undefined,
          error_code: undefined,
        },
      });
    });
  });

  describe("logDebug", () => {
    it("should log a debug message with context", async () => {
      await ErrorService.logDebug("Test debug", {
        userId: "user-123",
        username: "testuser",
        route: "/api/test",
        method: "POST",
        additionalContext: { key: "value" },
      });

      expect(prisma.errorLog.create).toHaveBeenCalledWith({
        data: {
          level: "debug",
          message: "Test debug",
          user_id: "user-123",
          username: "testuser",
          route: "/api/test",
          method: "POST",
          context: '{"key":"value"}',
          stack_trace: undefined,
          ip_address: undefined,
          user_agent: undefined,
          request_body: undefined,
          request_params: undefined,
          request_query: undefined,
          error_code: undefined,
        },
      });
    });
  });

  describe("getErrorLogs", () => {
    it("should get error logs with default parameters", async () => {
      const mockLogs: Array<{
        id: string;
        level: string;
        message: string;
        stack_trace: string | null;
        user_id: string | null;
        username: string | null;
        route: string | null;
        method: string | null;
        ip_address: string | null;
        user_agent: string | null;
        request_body: JsonValue | null;
        request_params: string | null;
        request_query: string | null;
        error_code: string | null;
        context: string | null;
        created_at: Date;
      }> = [];
      vi.mocked(prisma.errorLog.findMany).mockResolvedValue(mockLogs);

      const result = await ErrorService.getErrorLogs();

      expect(prisma.errorLog.findMany).toHaveBeenCalledWith({
        where: { AND: [] },
        orderBy: { created_at: "desc" },
        take: 20,
        skip: 0,
        select: {
          id: true,
          level: true,
          message: true,
          stack_trace: true,
          user_id: true,
          username: true,
          tenant_slug: true,
          route: true,
          method: true,
          ip_address: true,
          user_agent: true,
          request_body: true,
          request_params: true,
          request_query: true,
          error_code: true,
          context: true,
          created_at: true,
        },
      });
      expect(result).toEqual(mockLogs);
    });

    it("should get error logs with space-formatted dates", async () => {
      const mockLogs: Array<{
        id: string;
        level: string;
        message: string;
        stack_trace: string | null;
        user_id: string | null;
        username: string | null;
        route: string | null;
        method: string | null;
        ip_address: string | null;
        user_agent: string | null;
        request_body: JsonValue | null;
        request_params: string | null;
        request_query: string | null;
        error_code: string | null;
        context: string | null;
        created_at: Date;
      }> = [];
      vi.mocked(prisma.errorLog.findMany).mockResolvedValue(mockLogs);

      await ErrorService.getErrorLogs({
        startDate: "2024-01-01 00:00:00",
        endDate: "2024-12-31 23:59:59",
        skip: 10,
        take: 50,
      });

      expect(prisma.errorLog.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              created_at: {
                gte: new Date("2024-01-01 00:00:00"),
                lte: new Date("2024-12-31 23:59:59"),
              },
            },
          ],
        },
        orderBy: { created_at: "desc" },
        take: 50,
        skip: 10,
        select: {
          id: true,
          level: true,
          message: true,
          stack_trace: true,
          user_id: true,
          username: true,
          tenant_slug: true,
          route: true,
          method: true,
          ip_address: true,
          user_agent: true,
          request_body: true,
          request_params: true,
          request_query: true,
          error_code: true,
          context: true,
          created_at: true,
        },
      });
    });

    it("should get error logs with filters", async () => {
      const mockLogs: Array<{
        id: string;
        level: string;
        message: string;
        stack_trace: string | null;
        user_id: string | null;
        username: string | null;
        route: string | null;
        method: string | null;
        ip_address: string | null;
        user_agent: string | null;
        request_body: JsonValue | null;
        request_params: string | null;
        request_query: string | null;
        error_code: string | null;
        context: string | null;
        created_at: Date;
      }> = [];
      vi.mocked(prisma.errorLog.findMany).mockResolvedValue(mockLogs);

      await ErrorService.getErrorLogs({
        level: "error",
        userId: "user-123",
        q: "test",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        skip: 10,
        take: 50,
      });

      expect(prisma.errorLog.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            { level: "error" },
            { user_id: "user-123" },
            {
              OR: [
                { username: { contains: "test", mode: "insensitive" } },
                { route: { contains: "test", mode: "insensitive" } },
                { error_code: { contains: "test", mode: "insensitive" } },
              ],
            },
            {
              created_at: {
                gte: new Date("2024-01-01T00:00:00.000Z"),
                lte: new Date("2024-12-31T23:59:59.999Z"),
              },
            },
          ],
        },
        orderBy: { created_at: "desc" },
        take: 50,
        skip: 10,
        select: {
          id: true,
          level: true,
          message: true,
          stack_trace: true,
          user_id: true,
          username: true,
          tenant_slug: true,
          route: true,
          method: true,
          ip_address: true,
          user_agent: true,
          request_body: true,
          request_params: true,
          request_query: true,
          error_code: true,
          context: true,
          created_at: true,
        },
      });
    });
  });

  describe("getErrorLogsCount", () => {
    it("should get error logs count with filters", async () => {
      vi.mocked(prisma.errorLog.count).mockResolvedValue(100);

      const result = await ErrorService.getErrorLogsCount({
        level: "error",
        userId: "user-123",
        q: "test",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });

      expect(prisma.errorLog.count).toHaveBeenCalledWith({
        where: {
          AND: [
            { level: "error" },
            { user_id: "user-123" },
            {
              OR: [
                { username: { contains: "test", mode: "insensitive" } },
                { route: { contains: "test", mode: "insensitive" } },
                { error_code: { contains: "test", mode: "insensitive" } },
              ],
            },
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

    it("should get error logs count without filters", async () => {
      vi.mocked(prisma.errorLog.count).mockResolvedValue(200);

      const result = await ErrorService.getErrorLogsCount();

      expect(prisma.errorLog.count).toHaveBeenCalledWith({
        where: { AND: [] },
      });
      expect(result).toBe(200);
    });

    it("should filter by tenant slug", async () => {
      vi.mocked(prisma.errorLog.count).mockResolvedValue(5);

      await ErrorService.getErrorLogsCount({ tenantSlug: "acme" });

      expect(prisma.errorLog.count).toHaveBeenCalledWith({
        where: { AND: [{ tenant_slug: "acme" }] },
      });
    });

    it("should include legacy null tenant_slug rows for default tenant", async () => {
      vi.mocked(prisma.errorLog.count).mockResolvedValue(5);

      await ErrorService.getErrorLogsCount({ tenantSlug: "default" });

      expect(prisma.errorLog.count).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              OR: [{ tenant_slug: "default" }, { tenant_slug: null }],
            },
          ],
        },
      });
    });

    it("should get error logs count with space-formatted dates", async () => {
      vi.mocked(prisma.errorLog.count).mockResolvedValue(50);

      const result = await ErrorService.getErrorLogsCount({
        startDate: "2024-01-01 00:00:00",
        endDate: "2024-12-31 23:59:59",
      });

      expect(prisma.errorLog.count).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              created_at: {
                gte: new Date("2024-01-01 00:00:00"),
                lte: new Date("2024-12-31 23:59:59"),
              },
            },
          ],
        },
      });
      expect(result).toBe(50);
    });
  });

  describe("getErrorLogsByLevel", () => {
    it("should get error logs by level", async () => {
      const mockLogs: Array<{
        id: string;
        level: string;
        message: string;
        stack_trace: string | null;
        user_id: string | null;
        username: string | null;
        route: string | null;
        method: string | null;
        ip_address: string | null;
        user_agent: string | null;
        request_body: JsonValue | null;
        request_params: string | null;
        request_query: string | null;
        error_code: string | null;
        context: string | null;
        created_at: Date;
      }> = [];
      vi.mocked(prisma.errorLog.findMany).mockResolvedValue(mockLogs);

      await ErrorService.getErrorLogsByLevel("error", 50);

      expect(prisma.errorLog.findMany).toHaveBeenCalledWith({
        where: { AND: [{ level: "error" }] },
        orderBy: { created_at: "desc" },
        take: 50,
        skip: 0,
        select: {
          id: true,
          level: true,
          message: true,
          stack_trace: true,
          user_id: true,
          username: true,
          tenant_slug: true,
          route: true,
          method: true,
          ip_address: true,
          user_agent: true,
          request_body: true,
          request_params: true,
          request_query: true,
          error_code: true,
          context: true,
          created_at: true,
        },
      });
    });
  });

  describe("getErrorLogsByUser", () => {
    it("should get error logs by user", async () => {
      const mockLogs: Array<{
        id: string;
        level: string;
        message: string;
        stack_trace: string | null;
        user_id: string | null;
        username: string | null;
        route: string | null;
        method: string | null;
        ip_address: string | null;
        user_agent: string | null;
        request_body: JsonValue | null;
        request_params: string | null;
        request_query: string | null;
        error_code: string | null;
        context: string | null;
        created_at: Date;
      }> = [];
      vi.mocked(prisma.errorLog.findMany).mockResolvedValue(mockLogs);

      await ErrorService.getErrorLogsByUser("user-123", 50);

      expect(prisma.errorLog.findMany).toHaveBeenCalledWith({
        where: { AND: [{ user_id: "user-123" }] },
        orderBy: { created_at: "desc" },
        take: 50,
        skip: 0,
        select: {
          id: true,
          level: true,
          message: true,
          stack_trace: true,
          user_id: true,
          username: true,
          tenant_slug: true,
          route: true,
          method: true,
          ip_address: true,
          user_agent: true,
          request_body: true,
          request_params: true,
          request_query: true,
          error_code: true,
          context: true,
          created_at: true,
        },
      });
    });
  });

  describe("getErrorStats", () => {
    it("should get error statistics", async () => {
      const mockLogs = [
        { level: "error", route: "/api/test", error_code: "ERR_001" },
        { level: "error", route: "/api/test", error_code: "ERR_001" },
        { level: "warn", route: "/api/other", error_code: "ERR_002" },
      ];
      vi.mocked(prisma.errorLog.findMany).mockResolvedValue(
        mockLogs as unknown as Awaited<
          ReturnType<typeof prisma.errorLog.findMany>
        >,
      );

      const result = await ErrorService.getErrorStats();

      expect(prisma.errorLog.findMany).toHaveBeenCalledWith({
        where: { AND: [] },
        select: {
          level: true,
          route: true,
          error_code: true,
        },
      });
      expect(result).toEqual({
        total: 3,
        byLevel: { error: 2, warn: 1 },
        byRoute: { "/api/test": 2, "/api/other": 1 },
        byErrorCode: { ERR_001: 2, ERR_002: 1 },
      });
    });

    it("should get error statistics with space-formatted dates", async () => {
      const mockLogs: Awaited<ReturnType<typeof prisma.errorLog.findMany>> = [];
      vi.mocked(prisma.errorLog.findMany).mockResolvedValue(mockLogs);

      await ErrorService.getErrorStats({
        startDate: "2024-01-01 00:00:00",
        endDate: "2024-12-31 23:59:59",
      });

      expect(prisma.errorLog.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              created_at: {
                gte: new Date("2024-01-01 00:00:00"),
                lte: new Date("2024-12-31 23:59:59"),
              },
            },
          ],
        },
        select: {
          level: true,
          route: true,
          error_code: true,
        },
      });
    });

    it("should get error statistics with time range", async () => {
      const mockLogs: Awaited<ReturnType<typeof prisma.errorLog.findMany>> = [];
      vi.mocked(prisma.errorLog.findMany).mockResolvedValue(mockLogs);

      await ErrorService.getErrorStats({
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });

      expect(prisma.errorLog.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              created_at: {
                gte: new Date("2024-01-01T00:00:00.000Z"),
                lte: new Date("2024-12-31T23:59:59.999Z"),
              },
            },
          ],
        },
        select: {
          level: true,
          route: true,
          error_code: true,
        },
      });
    });

    it("should get error statistics with null route and error_code", async () => {
      const mockLogs = [
        { level: "error", route: null, error_code: null },
        { level: "warn", route: "/api/test", error_code: "ERR_001" },
      ];
      vi.mocked(prisma.errorLog.findMany).mockResolvedValue(
        mockLogs as unknown as Awaited<
          ReturnType<typeof prisma.errorLog.findMany>
        >,
      );

      const result = await ErrorService.getErrorStats();

      expect(result).toEqual({
        total: 2,
        byLevel: { error: 1, warn: 1 },
        byRoute: { "/api/test": 1 },
        byErrorCode: { ERR_001: 1 },
      });
    });
  });

  describe("cleanupOldLogs", () => {
    it("should clean up old error logs", async () => {
      vi.mocked(prisma.errorLog.deleteMany).mockResolvedValue({
        count: 100,
      });

      const result = await ErrorService.cleanupOldLogs(30);

      expect(prisma.errorLog.deleteMany).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              created_at: {
                lt: expect.any(Date),
              },
            },
          ],
        },
      });
      expect(result).toBe(100);
    });

    it("should clean up old error logs for a specific user", async () => {
      vi.mocked(prisma.errorLog.deleteMany).mockResolvedValue({
        count: 50,
      });

      const result = await ErrorService.cleanupOldLogs(30, "user-123");

      expect(prisma.errorLog.deleteMany).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              created_at: {
                lt: expect.any(Date),
              },
            },
            { user_id: "user-123" },
          ],
        },
      });
      expect(result).toBe(50);
    });
  });

  describe("getErrorLogById", () => {
    it("should get a single error log by ID", async () => {
      const mockLog = {
        id: "log-123",
        level: "error",
        message: "Test error",
        stack_trace: "Error stack trace",
        user_id: "user-123",
        username: "testuser",
        tenant_slug: "acme",
        route: "/api/test",
        method: "POST",
        ip_address: "127.0.0.1",
        user_agent: "Mozilla/5.0",
        request_body: { test: "data" },
        request_params: '{"id": "123"}',
        request_query: '{"page": "1"}',
        error_code: "ERR_001",
        context: '{"key": "value"}',
        created_at: new Date(),
      };
      vi.mocked(prisma.errorLog.findFirst).mockResolvedValue(mockLog);

      const result = await ErrorService.getErrorLogById("log-123", "acme");

      expect(prisma.errorLog.findFirst).toHaveBeenCalledWith({
        where: {
          AND: [{ id: "log-123" }, { tenant_slug: "acme" }],
        },
        select: {
          id: true,
          level: true,
          message: true,
          stack_trace: true,
          user_id: true,
          username: true,
          tenant_slug: true,
          route: true,
          method: true,
          ip_address: true,
          user_agent: true,
          request_body: true,
          request_params: true,
          request_query: true,
          error_code: true,
          context: true,
          created_at: true,
        },
      });
      expect(result).toEqual(mockLog);
    });

    it("should return null if error log not found", async () => {
      vi.mocked(prisma.errorLog.findFirst).mockResolvedValue(null);

      const result = await ErrorService.getErrorLogById("log-123", "acme");

      expect(result).toBeNull();
    });
  });

  describe("deleteErrorLog", () => {
    it("should delete a single error log by ID", async () => {
      vi.mocked(prisma.errorLog.deleteMany).mockResolvedValue({ count: 1 });

      await ErrorService.deleteErrorLog("log-123", "acme");

      expect(prisma.errorLog.deleteMany).toHaveBeenCalledWith({
        where: {
          AND: [{ id: "log-123" }, { tenant_slug: "acme" }],
        },
      });
    });
  });
});
