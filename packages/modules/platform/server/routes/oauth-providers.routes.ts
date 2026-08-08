import {
  handleRouteError,
  handleValidationError,
} from "@be-water/server-kernel/http/route-error-handler.js";
import {
  isOAuthProviderId,
} from "@be-water/server-kernel/kernel/auth/oauth-credentials.js";
import { emitAuditLogFromRequestSafe } from "@be-water/server-kernel/runtime/audit-log-emit.js";
import { success } from "@be-water/shared";

import { AuditAction } from "../../../audit/shared/index.js";
import {
  clearTenantOAuthProvider,
  getTenantOAuthProvidersStatus,
  upsertTenantOAuthProvider,
} from "../services/tenant-oauth.service.js";

import type { UpsertTenantOAuthProviderBody } from "../../shared/tenant-oauth.js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

async function auditOAuthChange(
  app: FastifyInstance,
  request: FastifyRequest,
  provider: string,
  action: "upsert" | "clear",
): Promise<void> {
  const { username } = request.authUser!;
  const slug = request.tenantContext!.tenant_slug;
  await emitAuditLogFromRequestSafe(app.events, app.log, request, {
    username,
    action: AuditAction.TENANT_OAUTH_UPDATE,
    resource: "tenant_oauth",
    detail_key: "platform.audit.tenant_oauth_updated",
    detail_params: { slug, provider, action },
    ipAddress: request.ip,
    userAgent: request.headers["user-agent"],
  });
}

/** 租户侧 OAuth 覆盖：`/api/settings/oauth-providers*` */
export async function tenantOAuthProvidersRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get(
    "/oauth-providers",
    {
      onRequest: [app.authenticate],
      preHandler: [app.requirePermission("settings.read")],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenant_id } = request.tenantContext!;
        return reply.send(
          success(await getTenantOAuthProvidersStatus(tenant_id)),
        );
      } catch (err) {
        return handleRouteError(
          reply,
          err,
          "[oauthProvidersRoutes] 获取 OAuth 配置失败",
          "GET_TENANT_OAUTH_FAILED",
        );
      }
    },
  );

  app.put<{ Params: { provider: string }; Body: UpsertTenantOAuthProviderBody }>(
    "/oauth-providers/:provider",
    {
      onRequest: [app.authenticate],
      preHandler: [app.requirePermission("settings.write")],
    },
    async (request, reply) => {
      try {
        const providerRaw = request.params.provider;
        if (!isOAuthProviderId(providerRaw)) {
          return handleValidationError(reply, "platform.oauth.provider_invalid");
        }
        const { tenant_id } = request.tenantContext!;
        const status = await upsertTenantOAuthProvider(
          tenant_id,
          providerRaw,
          request.body ?? { client_id: "", client_secret: "" },
        );
        await auditOAuthChange(app, request, providerRaw, "upsert");
        return reply.send(success(status));
      } catch (err) {
        return handleRouteError(
          reply,
          err,
          "[oauthProvidersRoutes] 保存 OAuth 配置失败",
          "PUT_TENANT_OAUTH_FAILED",
        );
      }
    },
  );

  app.delete<{ Params: { provider: string } }>(
    "/oauth-providers/:provider",
    {
      onRequest: [app.authenticate],
      preHandler: [app.requirePermission("settings.write")],
    },
    async (request, reply) => {
      try {
        const providerRaw = request.params.provider;
        if (!isOAuthProviderId(providerRaw)) {
          return handleValidationError(reply, "platform.oauth.provider_invalid");
        }
        const { tenant_id } = request.tenantContext!;
        const status = await clearTenantOAuthProvider(tenant_id, providerRaw);
        await auditOAuthChange(app, request, providerRaw, "clear");
        return reply.send(success(status));
      } catch (err) {
        return handleRouteError(
          reply,
          err,
          "[oauthProvidersRoutes] 清除 OAuth 配置失败",
          "DELETE_TENANT_OAUTH_FAILED",
        );
      }
    },
  );
}
