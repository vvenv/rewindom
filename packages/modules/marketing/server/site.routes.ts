import { defineRoute } from "@be-water/server-kernel/http/define-route.js";
import { parseMultipartFileUpload } from "@be-water/server-kernel/http/multipart-upload.js";
import { sendCodedError } from "@be-water/server-kernel/http/route-error-handler.js";
import { AppError } from "@be-water/server-kernel/lib/app-errors.js";
import { emitAuditLogFromRequestSafe } from "@be-water/server-kernel/runtime/audit-log-emit.js";
import { normalizeLocale } from "@be-water/shared";

import { AuditAction } from "../../audit/shared/index.js";
import { resolveLocaleSegment } from "../shared/site-locale.js";

import { resolveSiteAccountEntry } from "./site-account-entry.js";
import { uploadSiteAsset } from "./site-asset.service.js";
import {
  deleteFormSubmission,
  listFormSubmissions,
} from "./site-form.service.js";
import {
  applySiteStarter,
  createPage,
  deletePage,
  duplicatePage,
  getOrCreateSite,
  getPage,
  getPreviewSitePage,
  listPages,
  publishEditorDraft,
  revertEditorDraft,
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
  MarketingSiteCapabilities,
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

  /*
   * 编辑器据此决定「账户入口」开关能不能点、预览要不要画那枚登录按钮。
   *
   * 单独一条而不是并进 `GET /site`：能力来自跨模块的注入点（要按租户查开通状态），
   * 而 `toMarketingSite` 是一个纯粹的记录映射，为它引入异步查询会把所有调用方
   * 都拖成异步。
   */
  defineRoute(app, {
    method: "GET",
    url: "/capabilities",
    context: "SiteCapabilities",
    errorCode: "SITE_CAPABILITIES_FAILED",
    preHandler: [app.requirePermission("site.read")],
    handler: async (request) => {
      const tenant = request.tenantContext!;
      const entry = await resolveSiteAccountEntry({
        tenantId: tenant.tenant_id,
        locale: normalizeLocale(null),
      });
      return { account_entry: entry.available } satisfies MarketingSiteCapabilities;
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

  /** 一次发布：本页正文 + 站点级页头页脚，同一事务。 */
  defineRoute(app, {
    method: "POST",
    url: "/pages/:pageId/publish",
    context: "SitePagePublish",
    errorCode: "SITE_PAGE_PUBLISH_FAILED",
    preHandler: [app.requirePermission("site.write")],
    handler: async (request, reply) => {
      try {
        const { pageId } = request.params as { pageId: string };
        const { page, site } = await publishEditorDraft(
          request.tenantContext!.tenant_id,
          pageId,
        );
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.SITE_PAGE_PUBLISH,
          resource: page.id,
          detail_key: "marketing.audit.page_published",
          detail_params: { title: page.title },
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

  /** 一次撤销：正文与页头页脚的草稿一起回到线上那一版。 */
  defineRoute(app, {
    method: "POST",
    url: "/pages/:pageId/revert",
    context: "SitePageRevert",
    errorCode: "SITE_PAGE_REVERT_FAILED",
    preHandler: [app.requirePermission("site.write")],
    handler: async (request, reply) => {
      try {
        const { pageId } = request.params as { pageId: string };
        const { page, site } = await revertEditorDraft(
          request.tenantContext!.tenant_id,
          pageId,
        );
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.SITE_PAGE_UPDATE,
          resource: page.id,
          detail_key: "marketing.audit.page_content_reverted",
          detail_params: { title: page.title },
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

  /* ------------------------------------------------------------ 表单提交 */

  defineRoute(app, {
    method: "GET",
    url: "/form-submissions",
    context: "SiteFormSubmissionList",
    errorCode: "SITE_FORM_SUBMISSION_LIST_FAILED",
    preHandler: [app.requirePermission("site.read")],
    handler: async (request) => {
      const { page, page_size } = request.query as {
        page?: string;
        page_size?: string;
      };
      return listFormSubmissions(request.tenantContext!.tenant_id, {
        page: page ? Number(page) : undefined,
        page_size: page_size ? Number(page_size) : undefined,
      });
    },
  });

  defineRoute(app, {
    method: "DELETE",
    url: "/form-submissions/:id",
    context: "SiteFormSubmissionDelete",
    errorCode: "SITE_FORM_SUBMISSION_DELETE_FAILED",
    preHandler: [app.requirePermission("site.write")],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const removed = await deleteFormSubmission(
        request.tenantContext!.tenant_id,
        id,
      );
      if (!removed) {
        return sendCodedError(reply, 404, "site.form_submission_not_found");
      }
      // 提交里可能有访客留的联系方式，删除要留痕
      await emitAuditLogFromRequestSafe(app.events, app.log, request, {
        userId: request.authUser!.userId,
        username: request.authUser!.username,
        action: AuditAction.SITE_FORM_SUBMISSION_DELETE,
        resource: id,
        detail_key: "marketing.audit.form_submission_deleted",
      });
      return { deleted: true };
    },
  });
}
