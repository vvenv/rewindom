import { defineRoute } from "@be-water/server-kernel/http/define-route.js";

import {
  getPublishedPublicPage,
  getPublishedPublicSite,
} from "./site.service.js";

import type { FastifyInstance } from "fastify";

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
