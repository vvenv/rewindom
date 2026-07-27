import { beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted mocks — must be created before vi.mock factories (which are hoisted)
const { mockSlowQueryLogCreateMany, mockSlowQueryLogFindMany,
  mockSlowQueryLogCount, mockSlowQueryLogGroupBy,
  mockSlowQueryLogDeleteMany, mockGetRequestContext } = vi.hoisted(() => ({
    mockSlowQueryLogCreateMany: vi.fn(),
    mockSlowQueryLogFindMany: vi.fn(),
    mockSlowQueryLogCount: vi.fn(),
    mockSlowQueryLogGroupBy: vi.fn(),
    mockSlowQueryLogDeleteMany: vi.fn(),
    mockGetRequestContext: vi.fn(),
  }));

// Config mock
vi.mock("@be-water/server-kernel/lib/config.js", () => ({
  config: {
    observability: {
      slowQuery: {
        enabled: true,
        thresholdMs: 200,
        bufferSize: 10,
        flushIntervalMs: 2000,
        paramsMaxLen: 2000,
        retentionDays: 14,
      },
    },
  },
}));

// Prisma mock
vi.mock("@be-water/server-kernel/lib/prisma.js", () => ({
  prisma: {
    slowQueryLog: {
      createMany: mockSlowQueryLogCreateMany,
      findMany: mockSlowQueryLogFindMany,
      count: mockSlowQueryLogCount,
      groupBy: mockSlowQueryLogGroupBy,
      deleteMany: mockSlowQueryLogDeleteMany,
    },
  },
}));

// Request context mock
vi.mock("@be-water/server-kernel/lib/request-context.js", () => ({
  getRequestContext: (...args: unknown[]) => mockGetRequestContext(...args),
}));

import { SlowQueryService } from "./slow-query.service.js";

describe("SlowQueryService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Drain any buffered items from previous test
    SlowQueryService.flushNow().catch(() => {});
  });

  describe("enqueue", () => {
    it("skips queries below threshold", () => {
      SlowQueryService.enqueue(50, "SELECT 1", "", undefined);
      expect(mockSlowQueryLogCreateMany).not.toHaveBeenCalled();
    });

    it("skips excluded queries (INSERT INTO SlowQueryLog)", () => {
      SlowQueryService.enqueue(
        500,
        'INSERT INTO "SlowQueryLog" ("id", "query") VALUES ($1, $2)',
        '["abc","test"]',
        undefined,
      );
      expect(mockSlowQueryLogCreateMany).not.toHaveBeenCalled();
    });

    it("skips SELECT 1 (health check)", () => {
      SlowQueryService.enqueue(300, "SELECT 1", "", undefined);
      expect(mockSlowQueryLogCreateMany).not.toHaveBeenCalled();
    });

    it("skips BEGIN/COMMIT/ROLLBACK/DEALLOCATE/DISCARD", () => {
      SlowQueryService.enqueue(500, "BEGIN", "", undefined);
      SlowQueryService.enqueue(300, "COMMIT", "", undefined);
      SlowQueryService.enqueue(400, "ROLLBACK", "", undefined);
      SlowQueryService.enqueue(300, "DEALLOCATE ALL", "", undefined);
      SlowQueryService.enqueue(300, "DISCARD ALL", "", undefined);
      expect(mockSlowQueryLogCreateMany).not.toHaveBeenCalled();
    });

    it("flushes when buffer reaches size", () => {
      mockSlowQueryLogCreateMany.mockResolvedValue({ count: 1 });

      for (let i = 0; i < 10; i++) {
        SlowQueryService.enqueue(
          500,
          `SELECT * FROM "Order" WHERE "id" = $1`,
          `["order-${i}"]`,
          "quaint::connector::metrics",
        );
      }

      expect(mockSlowQueryLogCreateMany).toHaveBeenCalledTimes(1);
      expect(mockSlowQueryLogCreateMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            duration_ms: 500,
            fingerprint: expect.any(String),
            target: "quaint::connector::metrics",
            source: "unknown",
          }),
        ]),
        skipDuplicates: true,
      });
    });

    it("includes request context when available", () => {
      mockSlowQueryLogCreateMany.mockResolvedValue({ count: 1 });
      mockGetRequestContext.mockReturnValue({
        route: "/api/orders",
        method: "GET",
        tenant_slug: "test-tenant",
        user_id: "user-1",
        username: "testuser",
        request_id: "req-123",
        source: "http",
      });

      for (let i = 0; i < 10; i++) {
        SlowQueryService.enqueue(500, 'SELECT * FROM "Order"', "", undefined);
      }

      expect(mockSlowQueryLogCreateMany).toHaveBeenCalledTimes(1);
      const callData = mockSlowQueryLogCreateMany.mock.calls[0][0].data;
      expect(callData[0]).toMatchObject({
        route: "/api/orders",
        method: "GET",
        tenant_slug: "test-tenant",
        user_id: "user-1",
        username: "testuser",
        request_id: "req-123",
        source: "http",
      });
    });

    it("defaults to unknown source when no request context", () => {
      mockSlowQueryLogCreateMany.mockResolvedValue({ count: 1 });
      mockGetRequestContext.mockReturnValue(null);

      for (let i = 0; i < 10; i++) {
        SlowQueryService.enqueue(300, 'SELECT * FROM "Store"', "", undefined);
      }

      const callData = mockSlowQueryLogCreateMany.mock.calls[0][0].data;
      expect(callData[0].source).toBe("unknown");
    });
  });

  describe("getSlowQueryLogs", () => {
    it("returns mapped slow query items", async () => {
      const now = new Date();
      mockSlowQueryLogFindMany.mockResolvedValue([
        {
          id: "log-1",
          duration_ms: 500,
          query: 'SELECT * FROM "Order"',
          params: '["abc"]',
          fingerprint: "SELECT * FROM ORDER",
          target: "quaint",
          route: "/api/orders",
          method: "GET",
          tenant_slug: "test-tenant",
          user_id: "user-1",
          username: "testuser",
          request_id: "req-1",
          source: "http",
          created_at: now,
        },
      ]);

      const logs = await SlowQueryService.getSlowQueryLogs({
        skip: 0,
        take: 20,
        route: "/api/orders",
        tenant_slug: "test-tenant",
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].id).toBe("log-1");
      expect(logs[0].duration_ms).toBe(500);
      expect(logs[0].created_at).toBe(now.toISOString());
      expect(logs[0].route).toBe("/api/orders");
    });

    it("applies date range filters", async () => {
      mockSlowQueryLogFindMany.mockResolvedValue([]);

      await SlowQueryService.getSlowQueryLogs({
        skip: 0,
        take: 20,
        start_date: "2026-01-01",
        end_date: "2026-06-18",
      });

      expect(mockSlowQueryLogFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            created_at: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });
  });

  describe("getSlowQueryLogsCount", () => {
    it("returns count from prisma", async () => {
      mockSlowQueryLogCount.mockResolvedValue(42);

      const count = await SlowQueryService.getSlowQueryLogsCount({
        tenant_slug: "test-tenant",
      });

      expect(count).toBe(42);
      expect(mockSlowQueryLogCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenant_slug: "test-tenant",
          }),
        }),
      );
    });
  });

  describe("getSlowQueryStats", () => {
    it("returns aggregated stats", async () => {
      mockSlowQueryLogCount.mockResolvedValue(5);
      mockSlowQueryLogFindMany.mockResolvedValue([
        { duration_ms: 200 },
        { duration_ms: 300 },
        { duration_ms: 500 },
        { duration_ms: 800 },
        { duration_ms: 1200 },
      ]);
      mockSlowQueryLogGroupBy
        .mockResolvedValueOnce([
          {
            route: "/api/orders",
            _count: { id: 3 },
            _avg: { duration_ms: 500 },
          },
          {
            route: "/api/stores",
            _count: { id: 2 },
            _avg: { duration_ms: 300 },
          },
        ])
        .mockResolvedValueOnce([
          {
            fingerprint: "SELECT * FROM ORDER",
            _count: { id: 3 },
            _max: { duration_ms: 1200 },
            _avg: { duration_ms: 500 },
          },
        ]);

      const stats = await SlowQueryService.getSlowQueryStats({});

      expect(stats.total_count).toBe(5);
      expect(stats.avg_duration_ms).toBe(600);
      expect(stats.duration_max).toBe(1200);
      expect(stats.p95_duration_ms).toBe(1200);
      expect(stats.by_route).toHaveLength(2);
      expect(stats.by_fingerprint).toHaveLength(1);
      expect(stats.by_route[0]).toMatchObject({
        route: "/api/orders",
        count: 3,
        avg_duration_ms: 500,
      });
    });

    it("returns empty stats when no data", async () => {
      mockSlowQueryLogCount.mockResolvedValue(0);
      mockSlowQueryLogFindMany.mockResolvedValue([]);
      mockSlowQueryLogGroupBy.mockResolvedValue([]).mockResolvedValue([]);

      const stats = await SlowQueryService.getSlowQueryStats({});

      expect(stats.total_count).toBe(0);
      expect(stats.avg_duration_ms).toBe(0);
      expect(stats.p95_duration_ms).toBe(0);
      expect(stats.duration_max).toBe(0);
      expect(stats.by_route).toHaveLength(0);
      expect(stats.by_fingerprint).toHaveLength(0);
    });
  });

  describe("cleanupOldLogs", () => {
    it("deletes logs older than specified days", async () => {
      mockSlowQueryLogDeleteMany.mockResolvedValue({ count: 10 });

      const result = await SlowQueryService.cleanupOldLogs(14);

      expect(result).toBe(10);
      expect(mockSlowQueryLogDeleteMany).toHaveBeenCalledWith({
        where: {
          AND: [{ created_at: { lt: expect.any(Date) } }],
        },
      });
    });
  });

  describe("flushNow", () => {
    it("flushes buffered entries immediately", async () => {
      mockSlowQueryLogCreateMany.mockResolvedValue({ count: 1 });

      SlowQueryService.enqueue(500, 'SELECT * FROM "Order"', "", undefined);
      SlowQueryService.enqueue(500, 'SELECT * FROM "Store"', "", undefined);

      await SlowQueryService.flushNow();

      expect(mockSlowQueryLogCreateMany).toHaveBeenCalledTimes(1);
      const callData = mockSlowQueryLogCreateMany.mock.calls[0][0].data;
      expect(callData).toHaveLength(2);
    });

    it("handles empty buffer gracefully", async () => {
      await SlowQueryService.flushNow();
      expect(mockSlowQueryLogCreateMany).not.toHaveBeenCalled();
    });
  });
});
