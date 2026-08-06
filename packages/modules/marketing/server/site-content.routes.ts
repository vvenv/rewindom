import { defineRoute } from "@be-water/server-kernel/http/define-route.js";
import { isSiteMemberActor, type AppLocale  } from "@be-water/shared";

import { resolveLocaleSegment } from "../shared/site-locale.js";

import { getMemberContentPage } from "./site.service.js";

import type { FastifyInstance, FastifyRequest } from "fastify";

/** 非法 / 缺失的 `locale` 一律当没传，由服务层回落站点默认语言。 */
function queryLocale(request: FastifyRequest): AppLocale | null {
  const { locale } = request.query as { locale?: string };
  return typeof locale === "string" ? resolveLocaleSegment(locale) : null;
}

/**
 * 会员已认证后拉取受限页正文。
 *
 * 刻意不放进 `registerTenantGatedRoutes`：那条链路要求工作台用户 + entitlement，
 * 会员 token 过不去。中间件白名单已放行 `/api/site/content`，这里只校验 actor。
 */
export async function siteContentRoutes(app: FastifyInstance): Promise<void> {
  defineRoute(app, {
    method: "GET",
    url: "/page",
    context: "SiteMemberContentPage",
    errorCode: "SITE_MEMBER_CONTENT_PAGE_FAILED",
    handler: async (request, reply) => {
      if (
        !request.authUser ||
        !isSiteMemberActor(request.authUser.actor_type)
      ) {
        return reply.status(401).send({
          error: "Member sign-in required",
          code: "site_member.member_required",
        });
      }

      const hostTenant = request.hostTenantContext;
      if (!hostTenant) {
        return reply.status(404).send({
          error: "No site for this host",
          code: "site.host_unbound",
        });
      }

      // 会员 JWT 的租户必须与当前 Host 一致（中间件已 assertHostTenantMatch，
      // 这里再防一层：非绑定域上的会员 token 不该读到任何站点正文）。
      if (request.authUser.tenant_id !== hostTenant.tenant_id) {
        return reply.status(403).send({
          error: "Member does not belong to this site",
          code: "auth.host_tenant_mismatch",
        });
      }

      const { path: pagePath } = request.query as { path?: string };
      if (!pagePath || typeof pagePath !== "string") {
        return reply.status(400).send({
          error: "path is required",
          code: "site.path_required",
        });
      }

      const result = await getMemberContentPage(
        hostTenant.tenant_id,
        pagePath,
        hostTenant.tenant_slug,
        queryLocale(request),
      );
      if (!result) {
        return reply.status(404).send({
          error: "Page not found",
          code: "site.page_not_found",
        });
      }
      return result;
    },
  });
}
