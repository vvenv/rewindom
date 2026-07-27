import { isPlatformAdminActor, type AuthActorType, isApiKeyBlockedPath, isApiKeyToken  } from "@be-water/shared";

import { prisma } from "../lib/prisma.js";
import { updateRequestContext } from "../lib/request-context.js";

import { isAttachmentContentRequest } from "./attachment-content-cache.js";

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

interface AuthJwtPayload {
  userId: string;
  actor_type: AuthActorType;
  is_system_admin: boolean;
  type: "access" | "refresh";
  tenant_id?: string;
  tenant_slug?: string;
}

// 平台管理员只能打租户业务面之外的接口。`/api/auth/permissions` 也在列：
// 平台壳层要靠它拿到 platform.* 权限集，否则非系统管理员的平台管理员会被
// 前端 PermissionRoute 一路弹回首页（服务端本来是放行的）。
const PLATFORM_ALLOWED_PREFIXES = [
  "/api/platform",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/auth/permissions",
] as const;

function isPlatformAdminApiPath(path: string): boolean {
  return PLATFORM_ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
    requireTenantAdmin: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
    requirePlatformAdmin: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }

  interface FastifyRequest {
    authUser?: {
      userId: string;
      username: string;
      actor_type: AuthActorType;
      is_system_admin: boolean;
      tenant_id: string;
      tenant_slug: string;
    };
    tenantContext?: {
      tenant_id: string;
      tenant_slug: string;
    };
  }
}

const DOWNLOAD_TOKEN_BYPASS_PATHS = [
  /^\/api\/backup\/jobs\/[^/]+\/download\/?$/u,
  /^\/api\/platform\/backup\/jobs\/[^/]+\/download\/?$/u,
] as const;

function isDownloadTokenBypassPath(path: string): boolean {
  return DOWNLOAD_TOKEN_BYPASS_PATHS.some((pattern) => pattern.test(path));
}

export function isPlatformBackupDownloadTokenBypass(
  path: string,
  downloadToken: unknown,
): boolean {
  return (
    typeof downloadToken === "string" &&
    downloadToken.length > 0 &&
    isDownloadTokenBypassPath(path)
  );
}

export async function authMiddleware(app: FastifyInstance) {
  app.addHook(
    "onRequest",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (
        request.url.startsWith("/api/auth/login") ||
        request.url.startsWith("/api/auth/register") ||
        request.url.startsWith("/api/auth/refresh") ||
        request.url.startsWith("/api/captcha") ||
        request.url.startsWith("/api/public/") ||
        request.url.startsWith("/api/system-info")
      ) {
        return;
      }

      if (request.url === "/health") return;

      const downloadToken = (request.query as { download_token?: unknown })
        .download_token;
      const requestPath = request.url.split("?")[0] ?? "";
      if (isPlatformBackupDownloadTokenBypass(requestPath, downloadToken)) {
        return;
      }

      if (isAttachmentContentRequest(request.method, request.url)) {
        return;
      }

      if (!request.url.startsWith("/api")) return;

      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return reply.code(401).send({ error: "未授权" });
      }

      const token = authHeader.slice(7);

      try {
        const decoded = app.jwt.verify<AuthJwtPayload>(token);

        if (decoded.type !== "access") {
          return reply.code(401).send({ error: "令牌类型无效" });
        }

        if (isPlatformAdminActor(decoded.actor_type)) {
          if (!isPlatformAdminApiPath(requestPath)) {
            return reply
              .code(403)
              .send({ error: "平台管理员无法访问租户业务接口" });
          }

          const admin = await prisma.platformAdmin.findUnique({
            where: { id: decoded.userId },
            select: {
              username: true,
              enabled: true,
              is_system_admin: true,
              last_access_at: true,
            },
          });

          if (!admin || !admin.enabled) {
            return reply.code(401).send({ error: "用户不存在" });
          }

          const ACCESS_THROTTLE_MS = 60_000;
          const now = Date.now();
          const lastAccess = admin.last_access_at
            ? new Date(admin.last_access_at).getTime()
            : 0;
          if (now - lastAccess > ACCESS_THROTTLE_MS) {
            prisma.platformAdmin
              .update({
                where: { id: decoded.userId },
                data: { last_access_at: new Date() },
              })
              .catch(() => {});
          }

          request.authUser = {
            userId: decoded.userId,
            username: admin.username,
            actor_type: "platform_admin",
            is_system_admin: admin.is_system_admin,
            tenant_id: "",
            tenant_slug: "",
          };
          // 平台管理员不属于任何租户：tenant_id 保持 null，
          // 租户守卫据此放行跨租户查询（平台控制台本就该看到全量）。
          updateRequestContext({
            tenant_id: null,
            tenant_slug: null,
            user_id: decoded.userId,
            username: admin.username,
          });
          return;
        }

        if (!decoded.tenant_id || !decoded.tenant_slug) {
          return reply.code(401).send({ error: "令牌无效或已过期" });
        }

        if (requestPath.startsWith("/api/platform")) {
          return reply
            .code(403)
            .send({ error: "无权访问：需要平台管理员权限" });
        }

        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: {
            username: true,
            tenant_id: true,
            is_system_admin: true,
            last_access_at: true,
          },
        });

        if (!user || user.tenant_id !== decoded.tenant_id) {
          return reply.code(401).send({ error: "用户不存在" });
        }

        const tenant = await prisma.tenant.findUnique({
          where: { id: decoded.tenant_id },
          select: { status: true },
        });
        if (!tenant || tenant.status !== "active") {
          return reply.code(403).send({ error: "租户已暂停或不存在" });
        }

        const ACCESS_THROTTLE_MS = 60_000;
        const now = Date.now();
        const lastAccess = user.last_access_at
          ? new Date(user.last_access_at).getTime()
          : 0;
        if (now - lastAccess > ACCESS_THROTTLE_MS) {
          prisma.user
            .update({
              where: { id: decoded.userId },
              data: { last_access_at: new Date() },
            })
            .catch(() => {});
        }

        request.tenantContext = {
          tenant_id: decoded.tenant_id,
          tenant_slug: decoded.tenant_slug,
        };
        request.authUser = {
          userId: decoded.userId,
          username: user.username,
          actor_type: decoded.actor_type,
          is_system_admin: user.is_system_admin,
          tenant_id: decoded.tenant_id,
          tenant_slug: decoded.tenant_slug,
        };
        updateRequestContext({
          tenant_id: decoded.tenant_id,
          tenant_slug: decoded.tenant_slug,
          user_id: decoded.userId,
          username: user.username,
        });
      } catch {
        if (isApiKeyToken(token)) {
          if (isApiKeyBlockedPath(requestPath)) {
            return reply.code(403).send({ error: "API Key 无权访问该接口" });
          }

          const apiKeyProvider = app.registry?.getTenantApiKeyAuthProvider();
          const apiKey = apiKeyProvider
            ? await apiKeyProvider.authenticate(token)
            : null;
          if (!apiKey) {
            return reply.code(401).send({ error: "API Key 无效或已吊销" });
          }

          request.tenantContext = {
            tenant_id: apiKey.tenant_id,
            tenant_slug: apiKey.tenant_slug,
          };
          request.authUser = {
            userId: apiKey.key_id,
            username: apiKey.key_name,
            actor_type: "api_key",
            is_system_admin: false,
            tenant_id: apiKey.tenant_id,
            tenant_slug: apiKey.tenant_slug,
          };
          updateRequestContext({
            tenant_id: apiKey.tenant_id,
            tenant_slug: apiKey.tenant_slug,
            user_id: apiKey.key_id,
            username: apiKey.key_name,
          });
          return;
        }

        return reply.code(401).send({ error: "令牌无效或已过期" });
      }
    },
  );

  app.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.authUser) {
        return reply.code(401).send({ error: "未授权" });
      }
    },
  );

  app.decorate(
    "requireTenantAdmin",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.authUser) {
        return reply.code(401).send({ error: "未授权" });
      }
      if (
        request.authUser.actor_type !== "tenant_user" ||
        !request.authUser.is_system_admin
      ) {
        return reply.code(403).send({ error: "无权访问：需要租户系统管理员权限" });
      }
    },
  );

  app.decorate(
    "requirePlatformAdmin",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.authUser) {
        return reply.code(401).send({ error: "未授权" });
      }
      if (!isPlatformAdminActor(request.authUser.actor_type)) {
        return reply.code(403).send({ error: "无权访问：需要平台管理员权限" });
      }
    },
  );
}
