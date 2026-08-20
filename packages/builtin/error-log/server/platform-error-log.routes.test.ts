import FastifyJWT from "@fastify/jwt";
import { authMiddleware } from "@rewindom/server-kernel/middleware/auth.middleware.js";
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { PLATFORM_ADMIN_USER_ID } from "@rewindom/shared";
import Fastify, { type FastifyInstance } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./error.service.js", () => ({
  ErrorService: {
    getErrorLogs: vi.fn().mockResolvedValue([]),
    getErrorLogsCount: vi.fn().mockResolvedValue(0),
    getErrorStats: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@rewindom/server-kernel/lib/prisma.js", () => ({
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

import { ErrorService } from "./error.service.js";
import { registerPlatformErrorLogRoutes } from "./platform-error-log.routes.js";

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(FastifyJWT, { secret: "test-secret" });
  await authMiddleware(app);
  await app.register(
    async (platformApp) => {
      platformApp.addHook("onRequest", app.requirePlatformAdmin);
      await registerPlatformErrorLogRoutes(platformApp);
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

describe("platform error-log routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.platformAdmin.findUnique).mockResolvedValue({
      username: "platform",
      enabled: true,
      is_system_admin: true,
      last_access_at: null,
    } as never);
  });

  it("GET /error-logs 返回错误日志列表", async () => {
    vi.mocked(ErrorService.getErrorLogs).mockResolvedValueOnce([
      {
        id: "err-1",
        level: "error",
        message: "test error",
        route: "/api/test",
        error_code: "TEST_ERROR",
        tenant_slug: "rewindom",
        created_at: new Date("2026-01-01"),
      },
    ] as never);
    vi.mocked(ErrorService.getErrorLogsCount).mockResolvedValueOnce(1);

    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/platform/error-logs?level=error&page=1&page_size=10",
      headers: { authorization: `Bearer ${platformToken(app)}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.items).toHaveLength(1);
    expect(ErrorService.getErrorLogs).toHaveBeenCalledWith(
      expect.objectContaining({ level: "error" }),
    );
  });

  it("GET /error-logs/stats 返回错误统计", async () => {
    vi.mocked(ErrorService.getErrorStats).mockResolvedValueOnce({
      total: 42,
      by_level: { error: 30, warn: 12 },
    } as never);

    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/platform/error-logs/stats?start_date=2026-01-01&end_date=2026-06-18",
      headers: { authorization: `Bearer ${platformToken(app)}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.total).toBe(42);
  });
});
