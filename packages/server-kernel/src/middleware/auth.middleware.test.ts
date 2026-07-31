import { DEFAULT_TENANT_ID, PLATFORM_ADMIN_USER_ID } from "@be-water/shared";
import FastifyJWT from "@fastify/jwt";
import Fastify, { type FastifyInstance } from "fastify";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { authMiddleware } from "./auth.middleware.js";

vi.mock("../lib/config.js", () => ({
  config: {
    auth: {
      platformAdmin: { username: "platform", password: "", passwordHash: "" },
    },
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
    },
    platformAdmin: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

const { prisma } = await import("@be-water/server-kernel/lib/prisma.js");

describe("auth.middleware", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify({ logger: false });
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
});
