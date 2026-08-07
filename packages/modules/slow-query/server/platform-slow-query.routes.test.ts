import FastifyJWT from "@fastify/jwt";
import { authMiddleware } from "@be-water/server-kernel/middleware/auth.middleware.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { PLATFORM_ADMIN_USER_ID } from "@be-water/shared";
import Fastify, { type FastifyInstance } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./slow-query.service.js", () => ({
  SlowQueryService: {
    getSlowQueryLogs: vi.fn(),
    getSlowQueryLogsCount: vi.fn(),
    getSlowQueryStats: vi.fn(),
  },
}));

vi.mock("@be-water/server-kernel/lib/prisma.js", () => ({
  prisma: {
    // auth 中间件对每个 /api 请求都会 `resolveHostTenant()` 查一次租户；
    // 返回空 = 这个 Host 没绑定租户，平台路由才放行
    tenant: {
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
    },
    platformAdmin: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

import { registerPlatformSlowQueryRoutes } from "./platform-slow-query.routes.js";
import { SlowQueryService } from "./slow-query.service.js";

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(FastifyJWT, { secret: "test-secret" });
  await authMiddleware(app);
  await app.register(
    async (platformApp) => {
      platformApp.addHook("onRequest", app.requirePlatformAdmin);
      await registerPlatformSlowQueryRoutes(platformApp);
    },
    { prefix: "/api/platform" },
  );
  return app;
}

function platformToken(app: FastifyInstance): string {
  return app.jwt.sign({
    userId: PLATFORM_ADMIN_USER_ID,
    actor_type: "platform_admin",
    is_system_admin: true,
    type: "access",
  });
}

describe("platform slow-query routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.platformAdmin.findUnique).mockResolvedValue({
      username: "platform",
      enabled: true,
      is_system_admin: true,
      last_access_at: null,
    } as never);
  });

  describe("GET /slow-query-logs", () => {
    it("returns paginated slow query logs", async () => {
      vi.mocked(SlowQueryService.getSlowQueryLogs).mockResolvedValue([
        {
          id: "sq-1",
          duration_ms: 250,
          query: "SELECT 1",
          params: null,
          fingerprint: "fp-1",
          target: "default",
          route: "/api/test",
          method: "GET",
          tenant_slug: "default",
          user_id: null,
          username: null,
          request_id: null,
          source: "http",
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ]);
      vi.mocked(SlowQueryService.getSlowQueryLogsCount).mockResolvedValue(1);

      const app = await buildApp();
      const response = await app.inject({
        method: "GET",
        url: "/api/platform/slow-query-logs?page=1&page_size=20",
        headers: { authorization: `Bearer ${platformToken(app)}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data.items).toHaveLength(1);
    });

    it("passes tenant_slug filter", async () => {
      vi.mocked(SlowQueryService.getSlowQueryLogs).mockResolvedValue([]);
      vi.mocked(SlowQueryService.getSlowQueryLogsCount).mockResolvedValue(0);

      const app = await buildApp();
      await app.inject({
        method: "GET",
        url: "/api/platform/slow-query-logs?tenant_slug=tenant-a&page=1&page_size=10",
        headers: { authorization: `Bearer ${platformToken(app)}` },
      });

      expect(SlowQueryService.getSlowQueryLogs).toHaveBeenCalledWith(
        expect.objectContaining({ tenant_slug: "tenant-a" }),
      );
    });

    it("rejects unauthenticated requests", async () => {
      const app = await buildApp();
      const response = await app.inject({
        method: "GET",
        url: "/api/platform/slow-query-logs",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("GET /slow-query-logs/stats", () => {
    it("returns slow query stats", async () => {
      vi.mocked(SlowQueryService.getSlowQueryStats).mockResolvedValue({
        total_count: 10,
        avg_duration_ms: 300,
        p95_duration_ms: 500,
        duration_max: 800,
        by_route: [],
        by_fingerprint: [],
      });

      const app = await buildApp();
      const response = await app.inject({
        method: "GET",
        url: "/api/platform/slow-query-logs/stats",
        headers: { authorization: `Bearer ${platformToken(app)}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data.total_count).toBe(10);
    });
  });
});
