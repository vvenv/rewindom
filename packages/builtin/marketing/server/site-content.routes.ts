import { defineRoute } from "@rewindom/server-kernel/http/define-route.js";
import {
  DEFAULT_TENANT_ID,
  isSiteMemberActor,
  type AppLocale,
} from "@rewindom/shared";

import { resolveLocaleSegment } from "../shared/site-locale.js";

import { renderPageSectionsHtml } from "./render-page-sections-html.js";
import { resolveSectionEntitlements } from "./site-entitlements.js";
import { getMemberContentPage } from "./site.service.js";

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

/** 非法 / 缺失的 `locale` 一律当没传，由服务层回落站点默认语言。 */
function queryLocale(request: FastifyRequest): AppLocale | null {
  const { locale } = request.query as { locale?: string };
  return typeof locale === "string" ? resolveLocaleSegment(locale) : null;
}

async function requireMemberContentAccess(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<boolean> {
  if (
    !request.authUser ||
    !isSiteMemberActor(request.authUser.actor_type)
  ) {
    await reply.status(401).send({
      error: "Member sign-in required",
      code: "site_member.member_required",
    });
    return false;
  }

  const hostTenant = request.hostTenantContext;
  if (!hostTenant) {
    await reply.status(404).send({
      error: "No site for this host",
      code: "site.host_unbound",
    });
    return false;
  }

  // 会员 JWT 的租户必须与当前 Host 一致（中间件已 assertHostTenantMatch，
  // 这里再防一层：非绑定域上的会员 token 不该读到任何站点正文）。
  if (request.authUser.tenant_id !== hostTenant.tenant_id) {
    await reply.status(403).send({
      error: "Member does not belong to this site",
      code: "auth.host_tenant_mismatch",
    });
    return false;
  }

  return true;
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
      if (!(await requireMemberContentAccess(request, reply))) return;

      const hostTenant = request.hostTenantContext!;
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

  /**
   * 会员正文的 HTML 片段：公开站 site-enhance 注入用。
   * 渲染器与 SSR 同构（`renderPageSectionsHtml`），浏览器不解释 section JSON。
   */
  defineRoute(app, {
    method: "GET",
    url: "/page-html",
    context: "SiteMemberContentPageHtml",
    errorCode: "SITE_MEMBER_CONTENT_PAGE_HTML_FAILED",
    handler: async (request, reply) => {
      if (!(await requireMemberContentAccess(request, reply))) return;

      const hostTenant = request.hostTenantContext!;
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

      return {
        html: renderPageSectionsHtml(result.site, result.page, {
          // 会员正文里同样可能有贡献段，闸门口径与公开 SSR 一致
          enabledEntitlements: await resolveSectionEntitlements(
            hostTenant.tenant_id,
          ),
          isDefaultTenant: hostTenant.tenant_id === DEFAULT_TENANT_ID,
        }),
        title: result.page.title,
      };
    },
  });
}
