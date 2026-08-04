import { defineRoute } from "@be-water/server-kernel/http/define-route.js";
import { sendCodedError } from "@be-water/server-kernel/http/route-error-handler.js";
import { AppError } from "@be-water/server-kernel/lib/app-errors.js";

import { resolveLocaleSegment } from "../shared/site-locale.js";

import { openSiteAssetStream } from "./site-asset.service.js";
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
        const { stream, mime_type, size } = await openSiteAssetStream({
          tenant_slug: slug,
          filename,
        });
        reply.header("Content-Type", mime_type);
        reply.header("Content-Length", String(size));
        reply.header("Cache-Control", "public, max-age=31536000, immutable");
        return reply.send(stream);
      } catch (err) {
        if (err instanceof AppError && err.code) {
          return sendCodedError(reply, err.status, err.code, err.params);
        }
        throw err;
      }
    },
  });
}
