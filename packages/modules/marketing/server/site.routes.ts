import { defineRoute } from "@be-water/server-kernel/http/define-route.js";
import { parseMultipartFileUpload } from "@be-water/server-kernel/http/multipart-upload.js";
import { sendCodedError } from "@be-water/server-kernel/http/route-error-handler.js";
import { AppError } from "@be-water/server-kernel/lib/app-errors.js";
import { emitAuditLogFromRequestSafe } from "@be-water/server-kernel/runtime/audit-log-emit.js";


import { AuditAction } from "../../audit/shared/index.js";
import { resolveLocaleSegment } from "../shared/site-locale.js";

import { uploadSiteAsset } from "./site-asset.service.js";
import {
  applySiteStarter,
  createPage,
  deletePage,
  duplicatePage,
  getOrCreateSite,
  getPage,
  getPreviewSitePage,
  listPages,
  publishPageContent,
  publishSiteChrome,
  saveEditorDraft,
  setPageStatus,
  updatePage,
  updateSite,
} from "./site.service.js";
import { displaySiteName } from "./site.util.js";

import type {
  CreateMarketingPageBody,
  DuplicateMarketingPageBody,
  MarketingSite,
  SaveEditorDraftBody,
  UpdateMarketingPageBody,
  UpdateMarketingSiteBody,
} from "../shared/site-cms.js";
import type { FastifyInstance } from "fastify";

function auditSiteName(site: MarketingSite): string {
  return displaySiteName(site.site_name, site.default_locale);
}

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
          detail_params: { site_name: auditSiteName(site) },
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
    url: "/preview",
    context: "SitePreview",
    errorCode: "SITE_PREVIEW_FAILED",
    preHandler: [app.requirePermission("site.read")],
    handler: async (request, reply) => {
      const query = request.query as { path?: string; locale?: string };
      const path = typeof query.path === "string" ? query.path : "/";
      const result = await getPreviewSitePage(
        request.tenantContext!.tenant_id,
        path,
        request.tenantContext!.tenant_slug,
        typeof query.locale === "string"
          ? resolveLocaleSegment(query.locale)
          : null,
      );
      if (!result) {
        return sendCodedError(reply, 404, "site.page_not_found");
      }
      return result;
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

  /** 复制页面：主要用来从一种语言快速铺出另一种语言的同一篇内容。 */
  defineRoute(app, {
    method: "POST",
    url: "/pages/:pageId/duplicate",
    context: "SitePageDuplicate",
    errorCode: "SITE_PAGE_DUPLICATE_FAILED",
    preHandler: [app.requirePermission("site.write")],
    handler: async (request, reply) => {
      try {
        const { pageId } = request.params as { pageId: string };
        const body = request.body as DuplicateMarketingPageBody;
        const page = await duplicatePage(
          request.tenantContext!.tenant_id,
          pageId,
          body,
        );
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.SITE_PAGE_CREATE,
          resource: page.id,
          detail_key: "marketing.audit.page_duplicated",
          detail_params: { title: page.title, source: pageId },
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
    method: "POST",
    url: "/chrome/publish",
    context: "SiteChromePublish",
    errorCode: "SITE_CHROME_PUBLISH_FAILED",
    preHandler: [app.requirePermission("site.write")],
    handler: async (request, reply) => {
      try {
        const site = await publishSiteChrome(request.tenantContext!.tenant_id);
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.SITE_UPDATE,
          resource: site.id,
          detail_key: "marketing.audit.chrome_published",
          detail_params: { site_name: auditSiteName(site) },
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
    method: "POST",
    url: "/assets",
    context: "SiteAssetUpload",
    errorCode: "SITE_ASSET_UPLOAD_FAILED",
    preHandler: [app.requirePermission("site.write")],
    handler: async (request, reply) => {
      try {
        const uploaded = await parseMultipartFileUpload(request);
        if (!uploaded) {
          return sendCodedError(reply, 400, "site.asset_required");
        }
        const { tenant_id, tenant_slug } = request.tenantContext!;
        return await uploadSiteAsset({
          tenant_id,
          tenant_slug,
          buffer: uploaded.buffer,
          mime_type: uploaded.mimetype,
        });
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
    url: "/starters/:key/apply",
    context: "SiteStarterApply",
    errorCode: "SITE_STARTER_APPLY_FAILED",
    preHandler: [app.requirePermission("site.write")],
    handler: async (request, reply) => {
      try {
        const { key } = request.params as { key: string };
        const result = await applySiteStarter(
          request.tenantContext!.tenant_id,
          key,
        );
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.SITE_UPDATE,
          resource: result.site.id,
          detail_key: "marketing.audit.starter_applied",
          detail_params: { key, page_count: result.pages.length },
        });
        return result;
      } catch (err) {
        if (err instanceof AppError && err.code) {
          return sendCodedError(reply, err.status, err.code, err.params);
        }
        throw err;
      }
    },
  });

  defineRoute(app, {
    method: "PUT",
    url: "/pages/:pageId/draft",
    context: "SiteEditorDraftSave",
    errorCode: "SITE_EDITOR_DRAFT_SAVE_FAILED",
    preHandler: [app.requirePermission("site.write")],
    handler: async (request, reply) => {
      try {
        const { pageId } = request.params as { pageId: string };
        const body = request.body as SaveEditorDraftBody;
        const { page, site } = await saveEditorDraft(
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
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.SITE_UPDATE,
          resource: site.id,
          detail_key: "marketing.audit.site_updated",
          detail_params: { site_name: auditSiteName(site) },
        });
        return { page, site };
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
    url: "/pages/:pageId/content/publish",
    context: "SitePageContentPublish",
    errorCode: "SITE_PAGE_CONTENT_PUBLISH_FAILED",
    preHandler: [app.requirePermission("site.write")],
    handler: async (request, reply) => {
      try {
        const { pageId } = request.params as { pageId: string };
        const page = await publishPageContent(
          request.tenantContext!.tenant_id,
          pageId,
        );
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.SITE_PAGE_PUBLISH,
          resource: page.id,
          detail_key: "marketing.audit.page_content_published",
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
