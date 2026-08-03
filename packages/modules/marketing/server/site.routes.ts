import { defineRoute } from "@be-water/server-kernel/http/define-route.js";
import { sendCodedError } from "@be-water/server-kernel/http/route-error-handler.js";
import { AppError } from "@be-water/server-kernel/lib/app-errors.js";
import { emitAuditLogFromRequestSafe } from "@be-water/server-kernel/runtime/audit-log-emit.js";

import { AuditAction } from "../../audit/shared/index.js";
import {
  createPage,
  deletePage,
  getOrCreateSite,
  getPage,
  listPages,
  setPageStatus,
  updatePage,
  updateSite,
} from "./site.service.js";

import type {
  CreateMarketingPageBody,
  UpdateMarketingPageBody,
  UpdateMarketingSiteBody,
} from "../shared/site-cms.js";
import type { FastifyInstance } from "fastify";

export async function siteRoutes(app: FastifyInstance): Promise<void> {
  defineRoute(app, {
    method: "GET",
    url: "/",
    context: "SiteGet",
    errorCode: "SITE_GET_FAILED",
    preHandler: [app.requirePermission("site.read")],
    handler: async (request) => {
      return getOrCreateSite(request.tenantContext!.tenant_id);
    },
  });

  defineRoute(app, {
    method: "PATCH",
    url: "/",
    context: "SiteUpdate",
    errorCode: "SITE_UPDATE_FAILED",
    preHandler: [app.requirePermission("site.write")],
    handler: async (request, reply) => {
      try {
        const body = request.body as UpdateMarketingSiteBody;
        const site = await updateSite(request.tenantContext!.tenant_id, body);
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.SITE_UPDATE,
          resource: site.id,
          detail_key: "marketing.audit.site_updated",
          detail_params: { site_name: site.site_name },
        });
        return site;
      } catch (err) {
        if (err instanceof AppError && err.code) {
          return sendCodedError(reply, err.status, err.code, err.params);
        }
        throw err;
      }
    },
  });

  defineRoute(app, {
    method: "GET",
    url: "/pages",
    context: "SitePageList",
    errorCode: "SITE_PAGE_LIST_FAILED",
    preHandler: [app.requirePermission("site.read")],
    handler: async (request) => {
      return listPages(request.tenantContext!.tenant_id);
    },
  });

  defineRoute(app, {
    method: "GET",
    url: "/pages/:pageId",
    context: "SitePageDetail",
    errorCode: "SITE_PAGE_DETAIL_FAILED",
    preHandler: [app.requirePermission("site.read")],
    handler: async (request, reply) => {
      try {
        const { pageId } = request.params as { pageId: string };
        return await getPage(request.tenantContext!.tenant_id, pageId);
      } catch (err) {
        if (err instanceof AppError && err.code) {
          return sendCodedError(reply, err.status, err.code, err.params);
        }
        throw err;
      }
    },
  });

  defineRoute(app, {
    method: "POST",
    url: "/pages",
    context: "SitePageCreate",
    errorCode: "SITE_PAGE_CREATE_FAILED",
    preHandler: [app.requirePermission("site.write")],
    handler: async (request, reply) => {
      try {
        const body = request.body as CreateMarketingPageBody;
        const page = await createPage(request.tenantContext!.tenant_id, body);
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.SITE_PAGE_CREATE,
          resource: page.id,
          detail_key: "marketing.audit.page_created",
          detail_params: { title: page.title },
        });
        void reply.code(201);
        return page;
      } catch (err) {
        if (err instanceof AppError && err.code) {
          return sendCodedError(reply, err.status, err.code, err.params);
        }
        throw err;
      }
    },
  });

  defineRoute(app, {
    method: "PATCH",
    url: "/pages/:pageId",
    context: "SitePageUpdate",
    errorCode: "SITE_PAGE_UPDATE_FAILED",
    preHandler: [app.requirePermission("site.write")],
    handler: async (request, reply) => {
      try {
        const { pageId } = request.params as { pageId: string };
        const body = request.body as UpdateMarketingPageBody;
        const page = await updatePage(
          request.tenantContext!.tenant_id,
          pageId,
          body,
        );
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.SITE_PAGE_UPDATE,
          resource: page.id,
          detail_key: "marketing.audit.page_updated",
          detail_params: { title: page.title },
        });
        return page;
      } catch (err) {
        if (err instanceof AppError && err.code) {
          return sendCodedError(reply, err.status, err.code, err.params);
        }
        throw err;
      }
    },
  });

  defineRoute(app, {
    method: "DELETE",
    url: "/pages/:pageId",
    context: "SitePageDelete",
    errorCode: "SITE_PAGE_DELETE_FAILED",
    preHandler: [app.requirePermission("site.write")],
    handler: async (request, reply) => {
      try {
        const { pageId } = request.params as { pageId: string };
        await deletePage(request.tenantContext!.tenant_id, pageId);
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.SITE_PAGE_DELETE,
          resource: pageId,
          detail_key: "marketing.audit.page_deleted",
          detail_params: {},
        });
        return { ok: true };
      } catch (err) {
        if (err instanceof AppError && err.code) {
          return sendCodedError(reply, err.status, err.code, err.params);
        }
        throw err;
      }
    },
  });

  defineRoute(app, {
    method: "POST",
    url: "/pages/:pageId/publish",
    context: "SitePagePublish",
    errorCode: "SITE_PAGE_PUBLISH_FAILED",
    preHandler: [app.requirePermission("site.write")],
    handler: async (request, reply) => {
      try {
        const { pageId } = request.params as { pageId: string };
        const page = await setPageStatus(
          request.tenantContext!.tenant_id,
          pageId,
          "published",
        );
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.SITE_PAGE_PUBLISH,
          resource: page.id,
          detail_key: "marketing.audit.page_published",
          detail_params: { title: page.title },
        });
        return page;
      } catch (err) {
        if (err instanceof AppError && err.code) {
          return sendCodedError(reply, err.status, err.code, err.params);
        }
        throw err;
      }
    },
  });

  defineRoute(app, {
    method: "POST",
    url: "/pages/:pageId/unpublish",
    context: "SitePageUnpublish",
    errorCode: "SITE_PAGE_UNPUBLISH_FAILED",
    preHandler: [app.requirePermission("site.write")],
    handler: async (request, reply) => {
      try {
        const { pageId } = request.params as { pageId: string };
        const page = await setPageStatus(
          request.tenantContext!.tenant_id,
          pageId,
          "draft",
        );
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.SITE_PAGE_UNPUBLISH,
          resource: page.id,
          detail_key: "marketing.audit.page_unpublished",
          detail_params: { title: page.title },
        });
        return page;
      } catch (err) {
        if (err instanceof AppError && err.code) {
          return sendCodedError(reply, err.status, err.code, err.params);
        }
        throw err;
      }
    },
  });
}
