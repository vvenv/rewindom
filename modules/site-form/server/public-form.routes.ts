/**
 * 公开表单提交（匿名）。
 *
 * 挂在 `/api/public/site-form` 下，与工作台那套完全分开：这条路径没有会话，靠 Host
 * 认租户（`hostTenantContext`），所以口径都在 `form-submission.service`——字段表从
 * 已发布正文里现取、逐字段校验、按 IP 限流。这里只负责把请求翻译过去。
 *
 * 失败一律不透露细节：段不存在、不是表单、站点没发布，对外都是 404——探测者拿不到
 * 任何可用于枚举的反馈。只有「字段填得不对」会逐字段返回，那是填表人自己要看的。
 */

import { resolveLocaleSegment } from "@rewindom/builtin/marketing/shared/site-locale.js";
import { defineRoute, sendCodedError } from "@rewindom/module-sdk/server";

import { submitSiteForm } from "./form-submission.service.js";

import type { AppLocale } from "@rewindom/module-sdk";
import type { FastifyInstance, FastifyRequest } from "fastify";

/** 非法 / 缺失的 `locale` 一律当没传，由服务层回落站点默认语言。 */
function queryLocale(request: FastifyRequest): AppLocale | null {
  const { locale } = request.query as { locale?: string };
  return typeof locale === "string" ? resolveLocaleSegment(locale) : null;
}

export async function publicSiteFormRoutes(
  app: FastifyInstance,
): Promise<void> {
  defineRoute(app, {
    method: "POST",
    url: "/submit",
    context: "PublicSiteFormSubmit",
    errorCode: "PUBLIC_SITE_FORM_FAILED",
    handler: async (request, reply) => {
      const hostTenant = request.hostTenantContext;
      if (!hostTenant) {
        return reply
          .status(404)
          .send({ error: "No site for this host", code: "site.host_unbound" });
      }
      const body = (request.body ?? {}) as {
        path?: unknown;
        section_id?: unknown;
        values?: unknown;
      };
      if (
        typeof body.path !== "string" ||
        typeof body.section_id !== "string"
      ) {
        return sendCodedError(reply, 400, "site.form_invalid");
      }

      const result = await submitSiteForm({
        tenant_id: hostTenant.tenant_id,
        tenant_slug: hostTenant.tenant_slug,
        path: body.path,
        locale: queryLocale(request),
        section_id: body.section_id,
        values:
          body.values && typeof body.values === "object"
            ? (body.values as Record<string, unknown>)
            : {},
        ip: request.ip,
        user_agent: request.headers["user-agent"] ?? "",
      });

      if (result.status === "not_found") {
        return sendCodedError(reply, 404, "site.form_not_found");
      }
      if (result.status === "rate_limited") {
        return sendCodedError(reply, 429, "site.form_rate_limited");
      }
      if (result.status === "invalid") {
        // 逐字段的 code 直接给出去，段自己就地渲染；不用整体错误吞掉它们
        return reply.status(422).send({
          error: "Invalid form",
          code: "site.form_invalid",
          fields: result.fields,
        });
      }
      return { submitted: true };
    },
  });
}
