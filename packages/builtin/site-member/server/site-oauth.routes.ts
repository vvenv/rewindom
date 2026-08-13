import {
  handleRouteError,
  handleValidationError,
} from "@rewindom/server-kernel/http/route-error-handler.js";
import { isOAuthProviderId } from "@rewindom/server-kernel/kernel/auth/oauth-credentials.js";
import { emitAuditLogFromRequestSafe } from "@rewindom/server-kernel/runtime/audit-log-emit.js";
import { success } from "@rewindom/shared";

import { AuditAction } from "../../audit/shared/index.js";

import {
  clearSiteOAuthProvider,
  getSiteOAuthProvidersStatus,
  upsertSiteOAuthProvider,
} from "./site-oauth.service.js";

import type { UpsertSiteOAuthProviderBody } from "../shared/site-oauth.js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

async function auditOAuthChange(
  app: FastifyInstance,
  request: FastifyRequest,
  provider: string,
  action: "upsert" | "clear",
): Promise<void> {
  const { username } = request.authUser!;
  await emitAuditLogFromRequestSafe(app.events, app.log, request, {
    username,
    action: AuditAction.SITE_MEMBER_OAUTH_UPDATE,
    resource: "site_oauth",
    detail_key: "site_member.audit.oauth_updated",
    detail_params: { provider, action },
    ipAddress: request.ip,
    userAgent: request.headers["user-agent"],
  });
}

/**
 * 站点会员登录的 OAuth 覆盖：`/api/site-members/oauth-providers*`
 *
 * 权限用 `site_members.*` 而不是 `settings.*`——这份凭证决定的是「谁能注册成本站
 * 会员」，管会员的人就该能管它，不必再去要一个中台设置权限。
 */
export async function siteOAuthProvidersRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get(
    "/oauth-providers",
    {
      onRequest: [app.authenticate],
      preHandler: [app.requirePermission("site_members.read")],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenant_id } = request.tenantContext!;
        return reply.send(success(await getSiteOAuthProvidersStatus(tenant_id)));
      } catch (err) {
        return handleRouteError(
          reply,
          err,
          "[siteOAuthProvidersRoutes] 获取站点 OAuth 配置失败",
          "GET_SITE_OAUTH_FAILED",
        );
      }
    },
  );

  app.put<{ Params: { provider: string }; Body: UpsertSiteOAuthProviderBody }>(
    "/oauth-providers/:provider",
    {
      onRequest: [app.authenticate],
      preHandler: [app.requirePermission("site_members.write")],
    },
    async (request, reply) => {
      try {
        const providerRaw = request.params.provider;
        if (!isOAuthProviderId(providerRaw)) {
          return handleValidationError(
            reply,
            "site_member.oauth_provider_invalid",
          );
        }
        const { tenant_id } = request.tenantContext!;
        const status = await upsertSiteOAuthProvider(
          tenant_id,
          providerRaw,
          request.body ?? { client_id: "" },
        );
        await auditOAuthChange(app, request, providerRaw, "upsert");
        return reply.send(success(status));
      } catch (err) {
        return handleRouteError(
          reply,
          err,
          "[siteOAuthProvidersRoutes] 保存站点 OAuth 配置失败",
          "PUT_SITE_OAUTH_FAILED",
        );
      }
    },
  );

  app.delete<{ Params: { provider: string } }>(
    "/oauth-providers/:provider",
    {
      onRequest: [app.authenticate],
      preHandler: [app.requirePermission("site_members.write")],
    },
    async (request, reply) => {
      try {
        const providerRaw = request.params.provider;
        if (!isOAuthProviderId(providerRaw)) {
          return handleValidationError(
            reply,
            "site_member.oauth_provider_invalid",
          );
        }
        const { tenant_id } = request.tenantContext!;
        const status = await clearSiteOAuthProvider(tenant_id, providerRaw);
        await auditOAuthChange(app, request, providerRaw, "clear");
        return reply.send(success(status));
      } catch (err) {
        return handleRouteError(
          reply,
          err,
          "[siteOAuthProvidersRoutes] 清除站点 OAuth 配置失败",
          "DELETE_SITE_OAUTH_FAILED",
        );
      }
    },
  );
}
