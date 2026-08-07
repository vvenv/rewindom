import { DEFAULT_TENANT_ID, PLATFORM_ADMIN_USER_ID, MEMBER_ACCESS_COOKIE } from "@be-water/shared";
import FastifyCookie from "@fastify/cookie";
import FastifyJWT from "@fastify/jwt";
import Fastify, { type FastifyInstance } from "fastify";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { authMiddleware } from "./auth.middleware.js";

vi.mock("../lib/config.js", () => ({
  config: {
    auth: {
      platformAdmin: { username: "platform", password: "", passwordHash: "" },
    },
    // 产品站 vs 平台控制台 Host 分离；测试默认走控制台 Host（不绑租户）
    frontend: {
      url: "http://app.example.com",
    },
    platform: {
      url: "http://127.0.0.1:7300",
    },
    tenant: {
      baseDomain: "",
    },
    // 缓存只在「确知不是测试」时开；这里显式声明，逐条断言查库次数才成立
    server: { isTest: true },
  },
}));

const tenantAccessPayload = {
  userId: "user-123",
  actor_type: "tenant_user" as const,
  is_system_admin: false,
  tenant_id: DEFAULT_TENANT_ID,
  tenant_slug: "default",
  type: "access" as const,
};

function mockTenantAuthUser(is_system_admin = false): void {
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    username: "testuser",
    tenant_id: DEFAULT_TENANT_ID,
    is_system_admin,
    last_access_at: null,
  } as Awaited<ReturnType<typeof prisma.user.findUnique>>);
  vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
    status: "active",
  } as Awaited<ReturnType<typeof prisma.tenant.findUnique>>);
}

function mockPlatformAdminAuthUser(): void {
  vi.mocked(prisma.platformAdmin.findUnique).mockResolvedValue({
    username: "platform",
    enabled: true,
    is_system_admin: true,
    last_access_at: null,
  } as Awaited<ReturnType<typeof prisma.platformAdmin.findUnique>>);
}

vi.mock("../lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    tenant: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    platformAdmin: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    siteMember: {
      findUnique: vi.fn(),
    },
  },
}));

const { prisma } = await import("@be-water/server-kernel/lib/prisma.js");

describe("auth.middleware", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(prisma.tenant.findFirst).mockResolvedValue(null);
    app = Fastify({ logger: false });
    await app.register(FastifyCookie);
    await app.register(FastifyJWT, {
      secret: "test-secret",
    });
    await authMiddleware(app);
  });

  describe("skip routes", () => {
    it("should skip /api/auth/login", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/login",
      });

      expect(response.statusCode).not.toBe(401);
    });

    it("should skip /api/auth/refresh", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/refresh",
      });

      expect(response.statusCode).not.toBe(401);
    });

    it("should skip /api/captcha", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/captcha",
      });

      expect(response.statusCode).not.toBe(401);
    });

    it("should skip /api/public routes", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/public/plans",
      });

      expect(response.statusCode).not.toBe(401);
    });

    it("should skip /api/system-info", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/system-info",
      });

      expect(response.statusCode).not.toBe(401);
    });

    it("should skip /health", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/health",
      });

      expect(response.statusCode).not.toBe(401);
    });

    it("should skip non-api routes", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/static/file.js",
      });

      expect(response.statusCode).not.toBe(401);
    });

    it("should skip backup download with download_token", async () => {
      app.get("/api/backup/jobs/job-1/download", async () => ({ ok: true }));

      const response = await app.inject({
        method: "GET",
        url: "/api/backup/jobs/job-1/download?download_token=abc123",
      });

      expect(response.statusCode).toBe(200);
    });

    it("should skip attachment content without JWT", async () => {
      app.get("/api/attachments/att-1/content", async () => ({ ok: true }));

      const response = await app.inject({
        method: "GET",
        url: "/api/attachments/att-1/content",
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe("JWT authentication", () => {
    it("should return 401 without Authorization header", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/test",
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({ code: "common.unauthorized" });
    });

    it("should return 401 with invalid Authorization header format", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/test",
        headers: {
          authorization: "InvalidFormat",
        },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({ code: "common.unauthorized" });
    });

    it("should return 401 with invalid token", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/test",
        headers: {
          authorization: "Bearer invalid-token",
        },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({
        code: "auth.token_invalid_or_expired",
      });
    });

    it("should return 401 with refresh token type", async () => {
      const token = app.jwt.sign(
        {
          userId: "user-123",
          actor_type: "tenant_user",
          is_system_admin: false,
          type: "refresh",
        },
        { expiresIn: "1h" },
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/test",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({ code: "auth.token_invalid_type" });
    });

    it("should return 401 when user not found", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const token = app.jwt.sign(tenantAccessPayload, { expiresIn: "1h" });

      const response = await app.inject({
        method: "GET",
        url: "/api/test",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({ code: "user.not_found" });
    });

    it("should attach user info to request with valid token", async () => {
      mockTenantAuthUser();

      const token = app.jwt.sign(tenantAccessPayload, { expiresIn: "1h" });

      app.get("/api/test", async (request, reply) => {
        return reply.send(request.authUser);
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/test",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        userId: "user-123",
        username: "testuser",
        actor_type: "tenant_user",
        is_system_admin: false,
        tenant_id: DEFAULT_TENANT_ID,
        tenant_slug: "default",
      });
    });
  });

  describe("authenticate decorator", () => {
    it("should return 401 when authUser is not set", async () => {
      app.get("/api/test", async (request, reply) => {
        await app.authenticate(request, reply);
        return reply.send({ success: true });
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/test",
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({ code: "common.unauthorized" });
    });

    it("should pass when authUser is set", async () => {
      mockTenantAuthUser();

      const token = app.jwt.sign(tenantAccessPayload, { expiresIn: "1h" });

      app.get("/api/test", async (request, reply) => {
        await app.authenticate(request, reply);
        return reply.send({ success: true });
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/test",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe("requireTenantAdmin decorator", () => {
    it("should return 401 when authUser is not set", async () => {
      app.get("/api/test", async (request, reply) => {
        await app.requireTenantAdmin(request, reply);
        return reply.send({ success: true });
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/test",
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({ code: "common.unauthorized" });
    });

    it("should return 403 when user is not system admin", async () => {
      mockTenantAuthUser(false);

      const token = app.jwt.sign(tenantAccessPayload, { expiresIn: "1h" });

      app.get("/api/test", async (request, reply) => {
        await app.requireTenantAdmin(request, reply);
        return reply.send({ success: true });
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/test",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toMatchObject({
        code: "auth.tenant_system_admin_required",
      });
    });

    it("should pass when user is system admin", async () => {
      mockTenantAuthUser(true);

      const token = app.jwt.sign(
        { ...tenantAccessPayload, is_system_admin: true },
        { expiresIn: "1h" },
      );

      app.get("/api/test", async (request, reply) => {
        await app.requireTenantAdmin(request, reply);
        return reply.send({ success: true });
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/test",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe("platform admin", () => {
    it("allows platform admin on platform routes", async () => {
      mockPlatformAdminAuthUser();

      const token = app.jwt.sign(
        {
          userId: PLATFORM_ADMIN_USER_ID,
          actor_type: "platform_admin",
          is_system_admin: true,
          type: "access",
        },
        { expiresIn: "1h" },
      );

      app.get("/api/platform/tenants", async (request, reply) => {
        return reply.send(request.authUser);
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/platform/tenants",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().actor_type).toBe("platform_admin");
    });

    it("blocks platform admin on tenant business routes", async () => {
      mockPlatformAdminAuthUser();

      const token = app.jwt.sign(
        {
          userId: PLATFORM_ADMIN_USER_ID,
          actor_type: "platform_admin",
          is_system_admin: true,
          type: "access",
        },
        { expiresIn: "1h" },
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/orders",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it("allows platform admin to load its own permission set", async () => {
      mockPlatformAdminAuthUser();

      const token = app.jwt.sign(
        {
          userId: PLATFORM_ADMIN_USER_ID,
          actor_type: "platform_admin",
          is_system_admin: false,
          type: "access",
        },
        { expiresIn: "1h" },
      );

      app.get("/api/auth/permissions", async (request, reply) => {
        return reply.send(request.authUser);
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/auth/permissions",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().actor_type).toBe("platform_admin");
    });

    it("blocks tenant JWT on platform routes", async () => {
      mockTenantAuthUser();
      const token = app.jwt.sign(tenantAccessPayload, { expiresIn: "1h" });

      app.get("/api/platform/tenants", async () => ({ ok: true }));

      const response = await app.inject({
        method: "GET",
        url: "/api/platform/tenants",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("site_member actor", () => {
    const memberPayload = {
      userId: "member-1",
      actor_type: "site_member" as const,
      is_system_admin: false,
      tenant_id: DEFAULT_TENANT_ID,
      tenant_slug: "default",
      type: "access" as const,
    };

    function mockSiteMember(): void {
      vi.mocked(prisma.siteMember.findUnique).mockResolvedValue({
        email: "member@example.com",
        enabled: true,
        tenant_id: DEFAULT_TENANT_ID,
      } as never);
      vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
        status: "active",
      } as never);
    }

    it("allows member token on /api/member", async () => {
      mockSiteMember();
      const token = app.jwt.sign(memberPayload, { expiresIn: "1h" });
      app.get("/api/member/me", async (request) => request.authUser);

      const response = await app.inject({
        method: "GET",
        url: "/api/member/me",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().actor_type).toBe("site_member");
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it("allows member access cookie on /api/member when no Bearer", async () => {
      mockSiteMember();
      const token = app.jwt.sign(memberPayload, { expiresIn: "1h" });
      app.get("/api/member/me", async (request) => request.authUser);

      const response = await app.inject({
        method: "GET",
        url: "/api/member/me",
        cookies: { [MEMBER_ACCESS_COOKIE]: token },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().actor_type).toBe("site_member");
    });

    it("prefers Bearer over member cookie", async () => {
      mockSiteMember();
      const bearerToken = app.jwt.sign(memberPayload, { expiresIn: "1h" });
      const cookieToken = app.jwt.sign(
        { ...memberPayload, userId: "other-member" },
        { expiresIn: "1h" },
      );
      app.get("/api/member/me", async (request) => request.authUser);

      const response = await app.inject({
        method: "GET",
        url: "/api/member/me",
        headers: { authorization: `Bearer ${bearerToken}` },
        cookies: { [MEMBER_ACCESS_COOKIE]: cookieToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().userId).toBe("member-1");
    });

    it("does not accept member cookie on workbench API", async () => {
      mockSiteMember();
      const token = app.jwt.sign(memberPayload, { expiresIn: "1h" });
      app.get("/api/notes", async () => ({ ok: true }));

      const response = await app.inject({
        method: "GET",
        url: "/api/notes",
        cookies: { [MEMBER_ACCESS_COOKIE]: token },
      });

      expect(response.statusCode).toBe(401);
    });

    it("denies member token on workbench API", async () => {
      mockSiteMember();
      const token = app.jwt.sign(memberPayload, { expiresIn: "1h" });
      app.get("/api/notes", async () => ({ ok: true }));

      const response = await app.inject({
        method: "GET",
        url: "/api/notes",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json().code).toBe("auth.site_member_api_denied");
    });

    it("denies member token on /api/platform", async () => {
      mockSiteMember();
      const token = app.jwt.sign(memberPayload, { expiresIn: "1h" });
      app.get("/api/platform/tenants", async () => ({ ok: true }));

      const response = await app.inject({
        method: "GET",
        url: "/api/platform/tenants",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json().code).toBe("auth.platform_admin_required");
    });

    it("denies member token on bound host for another tenant", async () => {
      mockSiteMember();
      vi.mocked(prisma.tenant.findFirst).mockResolvedValue({
        id: "tenant-acme",
        slug: "acme",
        name: "Acme",
      } as never);
      const token = app.jwt.sign(memberPayload, { expiresIn: "1h" });
      app.get("/api/site/content/page", async () => ({ ok: true }));

      const response = await app.inject({
        method: "GET",
        url: "/api/site/content/page?path=/",
        headers: {
          authorization: `Bearer ${token}`,
          host: "portal.acme.io",
        },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json().code).toBe("tenant.host_mismatch");
    });

    it("skips auth for member login/register", async () => {
      for (const url of [
        "/api/member/login",
        "/api/member/register",
        "/api/member/refresh",
        "/api/member/logout",
      ]) {
        const response = await app.inject({ method: "POST", url });
        expect(response.statusCode).not.toBe(401);
      }
    });

    it("skips auth for member OAuth start/callback/exchange", async () => {
      app.get("/api/member/oauth/github", async () => ({ ok: true }));
      app.get("/api/member/oauth/github/callback", async () => ({ ok: true }));
      app.post("/api/member/oauth/exchange", async () => ({ ok: true }));

      for (const [method, url] of [
        ["GET", "/api/member/oauth/github"],
        ["GET", "/api/member/oauth/github/callback"],
        ["POST", "/api/member/oauth/exchange"],
      ] as const) {
        const response = await app.inject({ method, url });
        expect(response.statusCode).not.toBe(401);
      }
    });

    /*
     * 免认证是白名单，必须整条路径精确匹配。
     * 曾经用 `startsWith`：那样任何以白名单串开头的新路由都会静默免认证——
     * 给会员加个 `/api/member/login-history` 就等于开了个没鉴权的口子。
     */
    it("免认证白名单不放行仅仅是前缀相同的路径", async () => {
      app.get("/api/member/login-history", async () => ({ ok: true }));

      const response = await app.inject({
        method: "GET",
        url: "/api/member/login-history",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("host-bound tenant", () => {
    beforeEach(() => {
      vi.mocked(prisma.tenant.findFirst).mockResolvedValue({
        id: "tenant-acme",
        slug: "acme",
        name: "Acme",
      } as never);
    });

    it("rejects JWT for a different tenant on bound host", async () => {
      mockTenantAuthUser();
      const token = app.jwt.sign(tenantAccessPayload, { expiresIn: "1h" });

      app.get("/api/notes", async () => ({ ok: true }));

      const response = await app.inject({
        method: "GET",
        url: "/api/notes",
        headers: {
          authorization: `Bearer ${token}`,
          host: "portal.acme.io",
        },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json().code).toBe("tenant.host_mismatch");
    });

    it("allows matching tenant JWT on bound host", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        username: "bob",
        tenant_id: "tenant-acme",
        is_system_admin: false,
        last_access_at: null,
      } as never);
      vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
        status: "active",
      } as never);

      const token = app.jwt.sign(
        {
          userId: "user-acme",
          actor_type: "tenant_user",
          is_system_admin: false,
          tenant_id: "tenant-acme",
          tenant_slug: "acme",
          type: "access",
        },
        { expiresIn: "1h" },
      );

      app.get("/api/notes", async () => ({ ok: true }));

      const response = await app.inject({
        method: "GET",
        url: "/api/notes",
        headers: {
          authorization: `Bearer ${token}`,
          host: "portal.acme.io",
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it("blocks platform routes on bound host", async () => {
      mockPlatformAdminAuthUser();
      const token = app.jwt.sign(
        {
          userId: PLATFORM_ADMIN_USER_ID,
          actor_type: "platform_admin",
          is_system_admin: true,
          type: "access",
        },
        { expiresIn: "1h" },
      );

      app.get("/api/platform/tenants", async () => ({ ok: true }));

      const response = await app.inject({
        method: "GET",
        url: "/api/platform/tenants",
        headers: {
          authorization: `Bearer ${token}`,
          host: "portal.acme.io",
        },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json().code).toBe("tenant.host_platform_forbidden");
    });
  });
});
