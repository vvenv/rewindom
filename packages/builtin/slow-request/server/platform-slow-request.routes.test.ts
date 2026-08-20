import FastifyJWT from "@fastify/jwt";
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { authMiddleware } from "@rewindom/server-kernel/middleware/auth.middleware.js";
import { PLATFORM_ADMIN_USER_ID } from "@rewindom/shared";
import Fastify, { type FastifyInstance } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./slow-request.service.js", () => ({
  SlowRequestService: {
    getSlowRequestLogs: vi.fn(),
    getSlowRequestLogsCount: vi.fn(),
    getSlowRequestStats: vi.fn(),
  },
}));

vi.mock("@rewindom/server-kernel/lib/prisma.js", () => ({
  prisma: {
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

import { registerPlatformSlowRequestRoutes } from "./platform-slow-request.routes.js";
import { SlowRequestService } from "./slow-request.service.js";

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(FastifyJWT, { secret: "test-secret" });
  await authMiddleware(app);
  await app.register(
    async (platformApp) => {
      platformApp.addHook("onRequest", app.requirePlatformAdmin);
      await registerPlatformSlowRequestRoutes(platformApp);
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

describe("platform slow-request routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.platformAdmin.findUnique).mockResolvedValue({
      username: "platform",
      enabled: true,
      is_system_admin: true,
      last_access_at: null,
    } as never);
  });

  describe("GET /slow-request-logs", () => {
    it("returns paginated slow request logs", async () => {
      vi.mocked(SlowRequestService.getSlowRequestLogs).mockResolvedValue([
        {
          id: "sr-1",
          duration_ms: 900,
          status_code: 200,
          route: "/api/test",
          path: "/api/test",
          method: "GET",
          tenant_slug: "rewindom",
          user_id: null,
          username: null,
          request_id: null,
          source: "http",
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ]);
      vi.mocked(SlowRequestService.getSlowRequestLogsCount).mockResolvedValue(
        1,
      );

      const app = await buildApp();
      const response = await app.inject({
        method: "GET",
        url: "/api/platform/slow-request-logs?page=1&page_size=20",
        headers: { authorization: `Bearer ${platformToken(app)}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data.items).toHaveLength(1);
    });

    it("passes tenant_slug filter", async () => {
      vi.mocked(SlowRequestService.getSlowRequestLogs).mockResolvedValue([]);
      vi.mocked(SlowRequestService.getSlowRequestLogsCount).mockResolvedValue(
        0,
      );

      const app = await buildApp();
      await app.inject({
        method: "GET",
        url: "/api/platform/slow-request-logs?tenant_slug=tenant-a&page=1&page_size=10",
        headers: { authorization: `Bearer ${platformToken(app)}` },
      });

      expect(SlowRequestService.getSlowRequestLogs).toHaveBeenCalledWith(
        expect.objectContaining({ tenant_slug: "tenant-a" }),
      );
    });

    it("rejects unauthenticated requests", async () => {
      const app = await buildApp();
      const response = await app.inject({
        method: "GET",
        url: "/api/platform/slow-request-logs",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("GET /slow-request-logs/stats", () => {
    it("returns slow request stats", async () => {
      vi.mocked(SlowRequestService.getSlowRequestStats).mockResolvedValue({
        total_count: 10,
        avg_duration_ms: 700,
        p95_duration_ms: 1200,
        duration_max: 2000,
        by_route: [],
      });

      const app = await buildApp();
      const response = await app.inject({
        method: "GET",
        url: "/api/platform/slow-request-logs/stats",
        headers: { authorization: `Bearer ${platformToken(app)}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data.total_count).toBe(10);
    });
  });
});
