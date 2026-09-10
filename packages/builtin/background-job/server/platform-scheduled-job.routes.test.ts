import { registerJwt } from "@rewindom/server-kernel/kernel/auth/jwt.js";
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { authMiddleware } from "@rewindom/server-kernel/middleware/auth.middleware.js";
import { JobRegistry } from "@rewindom/server-kernel/runtime/job-registry.js";
import { PLATFORM_ADMIN_USER_ID } from "@rewindom/shared";
import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import {
  registerPlatformScheduledJobRoutes,
  setScheduledJobRegistry,
} from "./platform-scheduled-job.routes.js";

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await registerJwt(app, "test-secret");
  await authMiddleware(app);
  await app.register(
    async (platformApp) => {
      platformApp.addHook("onRequest", app.requirePlatformAdmin);
      await registerPlatformScheduledJobRoutes(platformApp);
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

describe("platform scheduled-job routes", () => {
  let registry: JobRegistry;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.platformAdmin.findUnique).mockResolvedValue({
      username: "platform",
      enabled: true,
      is_system_admin: true,
      last_access_at: null,
    } as never);

    registry = new JobRegistry();
    setScheduledJobRegistry(registry);
  });

  afterEach(() => {
    setScheduledJobRegistry(null);
  });

  it("GET /scheduled-jobs 返回运行态与失败数", async () => {
    registry.register({
      id: "slow-query-cleanup",
      moduleId: "slow-query",
      label: "Slow query log cleanup",
      schedules: [{ kind: "daily", hour: 8, minute: 35 }],
      run: () => {
        throw new Error("connection refused");
      },
    });
    registry.register({
      id: "mailer-retry",
      moduleId: "mailer",
      label: "Mail delivery retry",
      schedules: [{ kind: "interval", every_ms: 60_000 }],
      run: vi.fn(),
    });
    await registry.runJobOnce("slow-query-cleanup");
    await registry.runJobOnce("mailer-retry");

    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/platform/scheduled-jobs",
      headers: { authorization: `Bearer ${platformToken(app)}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json().data;
    expect(body.total).toBe(2);
    expect(body.failing).toBe(1);
    expect(typeof body.since).toBe("string");
    expect(body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "slow-query-cleanup",
          module_id: "slow-query",
          status: "error",
          last_error: "connection refused",
          consecutive_failures: 1,
          schedules: [{ kind: "daily", hour: 8, minute: 35 }],
        }),
        expect.objectContaining({
          id: "mailer-retry",
          status: "ok",
          consecutive_failures: 0,
        }),
      ]),
    );
  });

  it("命令式任务不出现在列表里", async () => {
    registry.register({
      id: "error-log-process-exceptions",
      moduleId: "error-log",
      label: "Process exception capture",
      start: vi.fn(),
    });

    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/platform/scheduled-jobs",
      headers: { authorization: `Bearer ${platformToken(app)}` },
    });

    expect(response.json().data.items).toHaveLength(0);
  });

  it("非平台管理员拿不到", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/platform/scheduled-jobs",
    });

    expect(response.statusCode).toBe(401);
  });
});
