import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockSlowRequestLogCreateMany,
  mockSlowRequestLogFindMany,
  mockSlowRequestLogCount,
  mockSlowRequestLogGroupBy,
  mockSlowRequestLogDeleteMany,
} = vi.hoisted(() => ({
  mockSlowRequestLogCreateMany: vi.fn(),
  mockSlowRequestLogFindMany: vi.fn(),
  mockSlowRequestLogCount: vi.fn(),
  mockSlowRequestLogGroupBy: vi.fn(),
  mockSlowRequestLogDeleteMany: vi.fn(),
}));

vi.mock("@rewindom/server-kernel/lib/config.js", () => ({
  config: {
    observability: {
      slowRequest: {
        enabled: true,
        thresholdMs: 500,
        bufferSize: 10,
        flushIntervalMs: 2000,
        retentionDays: 14,
      },
    },
  },
}));

vi.mock("@rewindom/server-kernel/lib/prisma.js", () => ({
  prisma: {
    slowRequestLog: {
      createMany: mockSlowRequestLogCreateMany,
      findMany: mockSlowRequestLogFindMany,
      count: mockSlowRequestLogCount,
      groupBy: mockSlowRequestLogGroupBy,
      deleteMany: mockSlowRequestLogDeleteMany,
    },
  },
}));

import { SlowRequestService } from "./slow-request.service.js";

import type { RequestTimingSample } from "@rewindom/server-kernel/middleware/request-timing.middleware.js";

function sample(
  overrides: Partial<RequestTimingSample> = {},
): RequestTimingSample {
  return {
    duration_ms: 800,
    status_code: 200,
    route: "/api/notes/:noteId",
    path: "/api/notes/n-1",
    method: "GET",
    tenant_slug: "acme",
    user_id: "u-1",
    username: "ada",
    request_id: "req-1",
    source: "http",
    ...overrides,
  };
}

describe("SlowRequestService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    SlowRequestService.flushNow().catch(() => {});
  });

  describe("enqueue", () => {
    it("skips requests below threshold", () => {
      SlowRequestService.enqueue(sample({ duration_ms: 120 }));
      expect(mockSlowRequestLogCreateMany).not.toHaveBeenCalled();
    });

    it("flushes when buffer reaches size", () => {
      mockSlowRequestLogCreateMany.mockResolvedValue({ count: 10 });

      for (let i = 0; i < 10; i++) {
        SlowRequestService.enqueue(
          sample({ path: `/api/notes/n-${i}`, request_id: `req-${i}` }),
        );
      }

      expect(mockSlowRequestLogCreateMany).toHaveBeenCalledTimes(1);
      expect(mockSlowRequestLogCreateMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            duration_ms: 800,
            route: "/api/notes/:noteId",
            method: "GET",
            status_code: 200,
            tenant_slug: "acme",
          }),
        ]),
        skipDuplicates: true,
      });
    });
  });

  describe("getSlowRequestLogs", () => {
    it("returns mapped items", async () => {
      const now = new Date();
      mockSlowRequestLogFindMany.mockResolvedValue([
        {
          id: "log-1",
          duration_ms: 800,
          status_code: 200,
          route: "/api/notes/:noteId",
          path: "/api/notes/n-1",
          method: "GET",
          tenant_slug: "acme",
          user_id: "u-1",
          username: "ada",
          request_id: "req-1",
          source: "http",
          created_at: now,
        },
      ]);

      const logs = await SlowRequestService.getSlowRequestLogs({
        skip: 0,
        take: 20,
        route: "/api/notes",
        tenant_slug: "acme",
      });

      expect(logs).toHaveLength(1);
      expect(logs[0]?.id).toBe("log-1");
      expect(logs[0]?.created_at).toBe(now.toISOString());
      expect(logs[0]?.route).toBe("/api/notes/:noteId");
    });
  });

  describe("getSlowRequestStats", () => {
    it("returns aggregated stats", async () => {
      mockSlowRequestLogCount.mockResolvedValue(5);
      mockSlowRequestLogFindMany.mockResolvedValue([
        { duration_ms: 500 },
        { duration_ms: 600 },
        { duration_ms: 700 },
        { duration_ms: 800 },
        { duration_ms: 1500 },
      ]);
      mockSlowRequestLogGroupBy.mockResolvedValue([
        {
          route: "/api/notes/:noteId",
          method: "GET",
          _count: { id: 3 },
          _avg: { duration_ms: 900 },
          _max: { duration_ms: 1500 },
        },
      ]);

      const stats = await SlowRequestService.getSlowRequestStats({});

      expect(stats.total_count).toBe(5);
      expect(stats.avg_duration_ms).toBe(820);
      expect(stats.duration_max).toBe(1500);
      expect(stats.p95_duration_ms).toBe(1500);
      expect(stats.by_route).toEqual([
        {
          route: "/api/notes/:noteId",
          method: "GET",
          count: 3,
          avg_duration_ms: 900,
          max_duration_ms: 1500,
        },
      ]);
    });

    it("returns empty stats when no data", async () => {
      mockSlowRequestLogCount.mockResolvedValue(0);
      mockSlowRequestLogFindMany.mockResolvedValue([]);
      mockSlowRequestLogGroupBy.mockResolvedValue([]);

      const stats = await SlowRequestService.getSlowRequestStats({});

      expect(stats.total_count).toBe(0);
      expect(stats.avg_duration_ms).toBe(0);
      expect(stats.p95_duration_ms).toBe(0);
      expect(stats.duration_max).toBe(0);
      expect(stats.by_route).toHaveLength(0);
    });
  });

  describe("cleanupOldLogs", () => {
    it("deletes logs older than specified days", async () => {
      mockSlowRequestLogDeleteMany.mockResolvedValue({ count: 7 });

      const result = await SlowRequestService.cleanupOldLogs(14);

      expect(result).toBe(7);
      expect(mockSlowRequestLogDeleteMany).toHaveBeenCalledWith({
        where: {
          AND: [{ created_at: { lt: expect.any(Date) } }],
        },
      });
    });
  });

  describe("flushNow", () => {
    it("flushes buffered entries immediately", async () => {
      mockSlowRequestLogCreateMany.mockResolvedValue({ count: 1 });

      SlowRequestService.enqueue(sample({ request_id: "a" }));
      SlowRequestService.enqueue(sample({ request_id: "b" }));
      await SlowRequestService.flushNow();

      expect(mockSlowRequestLogCreateMany).toHaveBeenCalledTimes(1);
      const callData = mockSlowRequestLogCreateMany.mock.calls[0]?.[0].data;
      expect(callData).toHaveLength(2);
    });

    it("handles empty buffer gracefully", async () => {
      await SlowRequestService.flushNow();
      expect(mockSlowRequestLogCreateMany).not.toHaveBeenCalled();
    });
  });
});
