import { defineRoute } from "@rewindom/server-kernel/http/define-route.js";
import { sendCodedError } from "@rewindom/server-kernel/http/route-error-handler.js";
import { sendStorageObject } from "@rewindom/server-kernel/http/send-storage-object.js";
import { AppError } from "@rewindom/server-kernel/lib/app-errors.js";

import {
  SITE_ENHANCE_HASH,
  SITE_ENHANCE_JS,
} from "../shared/site-enhance.js";
import { resolveLocaleSegment } from "../shared/site-locale.js";

import { resolveSiteAssetStorageKey, SITE_ASSET_CACHE_CONTROL } from "./site-asset.service.js";
import {
  getPublishedPublicPage,
  getPublishedPublicSite,
} from "./site.service.js";

import type { AppLocale } from "@rewindom/shared";
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
          cache_control: SITE_ASSET_CACHE_CONTROL,
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
