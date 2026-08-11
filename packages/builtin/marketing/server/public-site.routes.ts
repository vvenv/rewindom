import { defineRoute } from "@be-water/server-kernel/http/define-route.js";
import { sendCodedError } from "@be-water/server-kernel/http/route-error-handler.js";
import { sendStorageObject } from "@be-water/server-kernel/http/send-storage-object.js";
import { AppError } from "@be-water/server-kernel/lib/app-errors.js";

import {
  SITE_ENHANCE_HASH,
  SITE_ENHANCE_JS,
} from "../shared/site-enhance.js";
import { resolveLocaleSegment } from "../shared/site-locale.js";

import { resolveSiteAssetStorageKey } from "./site-asset.service.js";
import { submitSiteForm } from "./site-form.service.js";
import {
  getPublishedPublicPage,
  getPublishedPublicSite,
} from "./site.service.js";

import type { AppLocale } from "@be-water/shared";
import type { FastifyInstance, FastifyRequest } from "fastify";

/** 非法 / 缺失的 `locale` 一律当没传，由服务层回落站点默认语言。 */
function queryLocale(request: FastifyRequest): AppLocale | null {
  const { locale } = request.query as { locale?: string };
  return typeof locale === "string" ? resolveLocaleSegment(locale) : null;
}

export async function publicSiteRoutes(app: FastifyInstance): Promise<void> {
  /*
   * 公开站交互脚本：SSR 以 defer 注入。不走 defineRoute（那会包成 JSON）。
   * 内容哈希在 query `v=` 与 ETag，便于长缓存；源码变更后 hash 变、浏览器重拉。
   */
  app.get("/site-enhance.js", async (_request, reply) => {
    return reply
      .header("content-type", "application/javascript; charset=utf-8")
      .header("cache-control", "public, max-age=31536000, immutable")
      .header("etag", `"${SITE_ENHANCE_HASH}"`)
      .send(SITE_ENHANCE_JS);
  });

  defineRoute(app, {
    method: "GET",
    url: "/site",
    context: "PublicSite",
    errorCode: "PUBLIC_SITE_FAILED",
    handler: async (request, reply) => {
      const hostTenant = request.hostTenantContext;
      if (!hostTenant) {
        return reply.status(404).send({
          error: "No site for this host",
          code: "site.host_unbound",
        });
      }
      const site = await getPublishedPublicSite(
        hostTenant.tenant_id,
        hostTenant.tenant_slug,
        queryLocale(request),
      );
      if (!site) {
        return reply.status(404).send({
          error: "Site is not published",
          code: "site.not_published",
        });
      }
      return site;
    },
  });

  defineRoute(app, {
    method: "GET",
    url: "/site/page",
    context: "PublicSitePage",
    errorCode: "PUBLIC_SITE_PAGE_FAILED",
    handler: async (request, reply) => {
      const hostTenant = request.hostTenantContext;
      if (!hostTenant) {
        return reply.status(404).send({
          error: "No site for this host",
          code: "site.host_unbound",
        });
      }
      const { path: pagePath } = request.query as { path?: string };
      if (!pagePath || typeof pagePath !== "string") {
        return reply.status(400).send({
          error: "path is required",
          code: "site.path_required",
        });
      }
      const result = await getPublishedPublicPage(
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
   * 公开表单提交。
   *
   * 这个模块唯一一条**匿名写库**的路径，所以它的口径都在 `site-form.service`：字段表
   * 从已发布正文里现取、逐字段校验、按 IP 限流。这里只负责把请求翻译过去。
   *
   * 失败一律不透露细节：段不存在、不是表单、站点没发布，对外都是 404——探测者拿不到
   * 任何可用于枚举的反馈。只有「字段填得不对」会逐字段返回，那是填表人自己要看的。
   */
  defineRoute(app, {
    method: "POST",
    url: "/site/form",
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
      if (typeof body.path !== "string" || typeof body.section_id !== "string") {
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
        return reply
          .status(422)
          .send({ error: "Invalid form", code: "site.form_invalid", fields: result.fields });
      }
      return { submitted: true };
    },
  });

  defineRoute(app, {
    method: "GET",
    url: "/tenants/:slug/site-assets/:filename",
    context: "PublicSiteAsset",
    errorCode: "PUBLIC_SITE_ASSET_FAILED",
    handler: async (request, reply) => {
      try {
        const { slug, filename } = request.params as {
          slug: string;
          filename: string;
        };
        const { storage_key, mime_type } = await resolveSiteAssetStorageKey({
          tenant_slug: slug,
          filename,
        });
        const sent = await sendStorageObject(reply, storage_key, {
          mime_type,
          // 文件名带资产 id，内容永不改写
          cache_control: "public, max-age=31536000, immutable",
        });
        if (!sent) {
          return sendCodedError(reply, 404, "site.asset_not_found");
        }
        return reply;
      } catch (err) {
        if (err instanceof AppError && err.code) {
          return sendCodedError(reply, err.status, err.code, err.params);
        }
        throw err;
      }
    },
  });
}
