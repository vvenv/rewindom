import { isPlatformAdminActor, type AuthActorType, isApiKeyBlockedPath, isApiKeyToken  } from "@be-water/shared";

import { sendCodedError } from "../http/coded-error.js";
import {
  resolveHostTenant,
  resolveRequestHostname,
  type HostTenantContext,
} from "../lib/host-tenant.js";
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
    /** Host 绑定的租户；平台主域名或未绑定为 undefined/null */
    hostTenantContext?: HostTenantContext | null;
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

function assertHostTenantMatch(
  reply: FastifyReply,
  hostTenant: HostTenantContext | null | undefined,
  tenantId: string | null | undefined,
): boolean {
  if (!hostTenant) return true;
  if (!tenantId || tenantId !== hostTenant.tenant_id) {
    void sendCodedError(reply, 403, "tenant.host_mismatch");
    return false;
  }
  return true;
}

export async function authMiddleware(app: FastifyInstance) {
  app.addHook(
    "onRequest",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (request.url.startsWith("/api")) {
        const hostname = resolveRequestHostname(request.headers);
        request.hostTenantContext = await resolveHostTenant(hostname);
      }

      if (
        request.url.startsWith("/api/auth/login") ||
        request.url.startsWith("/api/auth/register") ||
        request.url.startsWith("/api/auth/refresh") ||
        request.url.startsWith("/api/auth/oauth/") ||
        request.url.startsWith("/api/captcha") ||
        request.url.startsWith("/api/public/") ||
        request.url.startsWith("/api/system-info") ||
        request.url.startsWith("/api/billing/webhooks/")
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

      if (
        request.hostTenantContext &&
        requestPath.startsWith("/api/platform")
      ) {
        return sendCodedError(reply, 403, "tenant.host_platform_forbidden");
      }

      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return sendCodedError(reply, 401, "common.unauthorized");
      }

      const token = authHeader.slice(7);

      try {
        const decoded = app.jwt.verify<AuthJwtPayload>(token);

        if (decoded.type !== "access") {
          return sendCodedError(reply, 401, "auth.token_invalid_type");
        }

        if (isPlatformAdminActor(decoded.actor_type)) {
          if (request.hostTenantContext) {
            return sendCodedError(reply, 403, "tenant.host_mismatch");
          }

          if (!isPlatformAdminApiPath(requestPath)) {
          return sendCodedError(
            reply,
            403,
            "auth.platform_admin_tenant_api_denied",
          );
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
          return sendCodedError(reply, 401, "user.not_found");
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
          return sendCodedError(reply, 401, "auth.token_invalid_or_expired");
        }

        if (requestPath.startsWith("/api/platform")) {
          return sendCodedError(reply, 403, "auth.platform_admin_required");
        }

        if (
          !assertHostTenantMatch(
            reply,
            request.hostTenantContext,
            decoded.tenant_id,
          )
        ) {
          return;
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
          return sendCodedError(reply, 401, "user.not_found");
        }

        const tenant = await prisma.tenant.findUnique({
          where: { id: decoded.tenant_id },
          select: { status: true },
        });
        if (!tenant || tenant.status !== "active") {
          return sendCodedError(reply, 403, "tenant.suspended_or_missing");
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
            return sendCodedError(reply, 403, "auth.api_key_forbidden");
          }

          const apiKeyProvider = app.registry?.getTenantApiKeyAuthProvider();
          const apiKey = apiKeyProvider
            ? await apiKeyProvider.authenticate(token)
            : null;
          if (!apiKey) {
            return sendCodedError(reply, 401, "auth.api_key_invalid");
          }

          if (
            !assertHostTenantMatch(
              reply,
              request.hostTenantContext,
              apiKey.tenant_id,
            )
          ) {
            return;
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

        return sendCodedError(reply, 401, "auth.token_invalid_or_expired");
      }
    },
  );

  app.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.authUser) {
        return sendCodedError(reply, 401, "common.unauthorized");
      }
    },
  );

  app.decorate(
    "requireTenantAdmin",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.authUser) {
        return sendCodedError(reply, 401, "common.unauthorized");
      }
      if (
        request.authUser.actor_type !== "tenant_user" ||
        !request.authUser.is_system_admin
      ) {
        return sendCodedError(
          reply,
          403,
          "auth.tenant_system_admin_required",
        );
      }
    },
  );

  app.decorate(
    "requirePlatformAdmin",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.authUser) {
        return sendCodedError(reply, 401, "common.unauthorized");
      }
      if (!isPlatformAdminActor(request.authUser.actor_type)) {
        return sendCodedError(reply, 403, "auth.platform_admin_required");
      }
    },
  );
}
