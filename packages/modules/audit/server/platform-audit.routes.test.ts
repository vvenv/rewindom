import FastifyJWT from "@fastify/jwt";
import { authMiddleware } from "@be-water/server-kernel/middleware/auth.middleware.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { PLATFORM_ADMIN_USER_ID } from "@be-water/shared";
import Fastify, { type FastifyInstance } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./audit.service.js", () => ({
  AuditService: {
    getAuditLogs: vi.fn().mockResolvedValue([]),
    getAuditLogsCount: vi.fn().mockResolvedValue(0),
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

import { AuditService } from "./audit.service.js";
import { registerPlatformAuditRoutes } from "./platform-audit.routes.js";

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(FastifyJWT, { secret: "test-secret" });
  await authMiddleware(app);
  await app.register(
    async (platformApp) => {
      platformApp.addHook("onRequest", app.requirePlatformAdmin);
      await registerPlatformAuditRoutes(platformApp);
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

describe("platform audit routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.platformAdmin.findUnique).mockResolvedValue({
      username: "platform",
      enabled: true,
      is_system_admin: true,
      last_access_at: null,
    } as never);
  });

  it("GET /audit-logs 返回审计日志列表", async () => {
    vi.mocked(AuditService.getAuditLogs).mockResolvedValueOnce([
      {
        id: "log-1",
        username: "admin",
        action: "TENANT_CREATE",
        resource: "tenant",
        details: "slug=test",
        detail_key: null,
        detail_params: null,
        ip_address: "127.0.0.1",
        created_at: new Date("2026-01-01"),
      },
    ] as never);
    vi.mocked(AuditService.getAuditLogsCount).mockResolvedValueOnce(1);

    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/platform/audit-logs?action=TENANT_CREATE&page=1&page_size=10",
      headers: { authorization: `Bearer ${platformToken(app)}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.items).toHaveLength(1);
    expect(AuditService.getAuditLogs).toHaveBeenCalledWith(
      expect.objectContaining({ action: "TENANT_CREATE" }),
    );
  });
});
