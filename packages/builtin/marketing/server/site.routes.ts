import { defineRoute } from "@be-water/server-kernel/http/define-route.js";
import { parseMultipartFileUpload } from "@be-water/server-kernel/http/multipart-upload.js";
import { sendCodedError } from "@be-water/server-kernel/http/route-error-handler.js";
import { AppError } from "@be-water/server-kernel/lib/app-errors.js";
import { emitAuditLogFromRequestSafe } from "@be-water/server-kernel/runtime/audit-log-emit.js";
import { DEFAULT_TENANT_ID, normalizeLocale } from "@be-water/shared";

import { AuditAction } from "../../audit/shared/index.js";
import { resolveLocaleSegment } from "../shared/site-locale.js";

import { resolveSiteAccountEntry } from "./site-account-entry.js";
import {
  deleteSiteAsset,
  listSiteAssets,
  updateSiteAssetAlt,
  uploadSiteAsset,
} from "./site-asset.service.js";
import { resolveSectionEntitlements } from "./site-entitlements.js";
import {
  deleteFormSubmission,
  listFormSubmissions,
} from "./site-form.service.js";
import { listSiteLinkTargets } from "./site-link-target.service.js";
import {
  getPageVersion,
  listPageVersions,
  restorePageVersion,
} from "./site-page-version.service.js";
import {
  deleteSiteRedirect,
  listSiteRedirects,
  saveSiteRedirect,
} from "./site-redirect.service.js";
import {
  applySiteTheme,
  createPage,
  deletePage,
  duplicatePage,
  getOrCreateSite,
  getPage,
  getPreviewSitePage,
  listPages,
  publishEditorDraft,
  publishSiteDraft,
  reorderPages,
  resetPageToPreset,
  revertSiteDraft,
  revertEditorDraft,
  saveSiteDraft,
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
  ReorderMarketingPagesBody,
  SaveSiteDraftBody,
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
      return {
        account_entry: entry.available,
        entitlements: [
          ...(await resolveSectionEntitlements(
            request.tenantContext!.tenant_id,
          )),
        ],
        is_default_tenant: tenant.tenant_id === DEFAULT_TENANT_ID,
      } satisfies MarketingSiteCapabilities;
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

  /*
   * 编辑器里「填链接」时的站内候选：页面 + 文档索引 + 每一篇文档。
   *
   * 候选是**按租户实时算**的，进不了 section schema 的静态 `options`——所以走一个
   * 端点而不是把它塞进 `/site` 的返回里：填链接是低频动作，没必要让每次打开编辑器
   * 都顺带拉一遍全部文档标题。
   */
  defineRoute(app, {
    method: "GET",
    url: "/link-targets",
    context: "SiteLinkTargets",
    errorCode: "SITE_LINK_TARGETS_FAILED",
    preHandler: [app.requirePermission("site.read")],
    handler: async (request) => {
      return listSiteLinkTargets(request.tenantContext!.tenant_id);
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
    method: "PUT",
    url: "/draft",
    context: "SiteDraftSave",
    errorCode: "SITE_DRAFT_SAVE_FAILED",
    preHandler: [app.requirePermission("site.write")],
    handler: async (request, reply) => {
      try {
        const body = request.body as SaveSiteDraftBody;
        const site = await saveSiteDraft(
          request.tenantContext!.tenant_id,
          body,
        );
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.SITE_UPDATE,
          resource: site.id,
          detail_key: "marketing.audit.site_updated",
          detail_params: { site_name: auditSiteName(site) },
        });
        return { site };
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
    url: "/draft/publish",
    context: "SiteDraftPublish",
    errorCode: "SITE_DRAFT_PUBLISH_FAILED",
    preHandler: [app.requirePermission("site.write")],
    handler: async (request, reply) => {
      try {
        const site = await publishSiteDraft(request.tenantContext!.tenant_id);
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.SITE_UPDATE,
          resource: site.id,
          detail_key: "marketing.audit.site_draft_published",
          detail_params: { site_name: auditSiteName(site) },
        });
        return { site };
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
    url: "/draft/revert",
    context: "SiteDraftRevert",
    errorCode: "SITE_DRAFT_REVERT_FAILED",
    preHandler: [app.requirePermission("site.write")],
    handler: async (request, reply) => {
      try {
        const site = await revertSiteDraft(request.tenantContext!.tenant_id);
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.SITE_UPDATE,
          resource: site.id,
          detail_key: "marketing.audit.site_draft_reverted",
          detail_params: { site_name: auditSiteName(site) },
        });
        return { site };
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

  /**
   * 整批重排页面顺序。
   *
   * 顺序是相对关系，所以是一个「整批」端点而不是逐页 PATCH `sort_order`——见
   * `reorderPages`。资源记站点自身：这一条审计说的是「站点的页面顺序变了」。
   */
  defineRoute(app, {
    method: "PUT",
    url: "/pages/order",
    context: "SitePageReorder",
    errorCode: "SITE_PAGE_REORDER_FAILED",
    preHandler: [app.requirePermission("site.write")],
    handler: async (request, reply) => {
      try {
        const body = request.body as ReorderMarketingPagesBody;
        const pages = await reorderPages(
          request.tenantContext!.tenant_id,
          body,
        );
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.SITE_PAGE_UPDATE,
          resource: request.tenantContext!.tenant_id,
          detail_key: "marketing.audit.pages_reordered",
          detail_params: { count: body?.items?.length ?? 0 },
        });
        return pages;
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

  /**
   * 重设为最新版式：结构对齐最新内置预设、租户内容尽量保留，**只写草稿**。
   * 合并语义见 `shared/preset-merge.ts`；满意再走发布，不满意「撤销更改」即可回退。
   */
  defineRoute(app, {
    method: "POST",
    url: "/pages/:pageId/reset-preset",
    context: "SitePageResetPreset",
    errorCode: "SITE_PAGE_RESET_PRESET_FAILED",
    preHandler: [app.requirePermission("site.write")],
    handler: async (request, reply) => {
      try {
        const { pageId } = request.params as { pageId: string };
        const page = await resetPageToPreset(
          request.tenantContext!.tenant_id,
          pageId,
        );
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.SITE_PAGE_UPDATE,
          resource: page.id,
          detail_key: "marketing.audit.page_reset_to_preset",
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
          // 版本历史的「谁改的」一列；审计日志另有一条，两者用途不同
          request.authUser!.username,
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

  /** 套用主题包：只换外观 token，内容与 logo 不动（见 `applySiteTheme`）。 */
  defineRoute(app, {
    method: "POST",
    url: "/themes/:key/apply",
    context: "SiteThemeApply",
    errorCode: "SITE_THEME_APPLY_FAILED",
    preHandler: [app.requirePermission("site.write")],
    handler: async (request, reply) => {
      try {
        const { key } = request.params as { key: string };
        const site = await applySiteTheme(
          request.tenantContext!.tenant_id,
          key,
        );
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.SITE_UPDATE,
          resource: site.id,
          detail_key: "marketing.audit.theme_applied",
          detail_params: { key },
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

  /* ------------------------------------------------------------ 版本历史 */

  defineRoute(app, {
    method: "GET",
    url: "/pages/:pageId/versions",
    context: "SitePageVersionList",
    errorCode: "SITE_PAGE_VERSION_LIST_FAILED",
    preHandler: [app.requirePermission("site.read")],
    handler: async (request) => {
      const { pageId } = request.params as { pageId: string };
      return listPageVersions(request.tenantContext!.tenant_id, pageId);
    },
  });

  defineRoute(app, {
    method: "GET",
    url: "/pages/:pageId/versions/:version",
    context: "SitePageVersionDetail",
    errorCode: "SITE_PAGE_VERSION_DETAIL_FAILED",
    preHandler: [app.requirePermission("site.read")],
    handler: async (request, reply) => {
      const { pageId, version } = request.params as {
        pageId: string;
        version: string;
      };
      const detail = await getPageVersion(
        request.tenantContext!.tenant_id,
        pageId,
        Number(version),
      );
      if (!detail) {
        return sendCodedError(reply, 404, "site.page_version_not_found");
      }
      return detail;
    },
  });

  /** 恢复到**草稿**，不直接覆盖线上——理由见 `restorePageVersion`。 */
  defineRoute(app, {
    method: "POST",
    url: "/pages/:pageId/versions/:version/restore",
    context: "SitePageVersionRestore",
    errorCode: "SITE_PAGE_VERSION_RESTORE_FAILED",
    preHandler: [app.requirePermission("site.write")],
    handler: async (request, reply) => {
      const { pageId, version } = request.params as {
        pageId: string;
        version: string;
      };
      const restored = await restorePageVersion(
        request.tenantContext!.tenant_id,
        pageId,
        Number(version),
      );
      if (!restored) {
        return sendCodedError(reply, 404, "site.page_version_not_found");
      }
      await emitAuditLogFromRequestSafe(app.events, app.log, request, {
        userId: request.authUser!.userId,
        username: request.authUser!.username,
        action: AuditAction.SITE_PAGE_VERSION_RESTORE,
        resource: pageId,
        detail_key: "marketing.audit.page_version_restored",
        detail_params: { version },
      });
      return { restored: true };
    },
  });

  /* -------------------------------------------------------------- 媒体库 */

  defineRoute(app, {
    method: "GET",
    url: "/assets",
    context: "SiteAssetList",
    errorCode: "SITE_ASSET_LIST_FAILED",
    preHandler: [app.requirePermission("site.read")],
    handler: async (request) => {
      const { tenant_id, tenant_slug } = request.tenantContext!;
      return listSiteAssets(tenant_id, tenant_slug);
    },
  });

  defineRoute(app, {
    method: "PATCH",
    url: "/assets/:id",
    context: "SiteAssetUpdate",
    errorCode: "SITE_ASSET_UPDATE_FAILED",
    preHandler: [app.requirePermission("site.write")],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const { alt } = (request.body ?? {}) as { alt?: unknown };
      const { tenant_id, tenant_slug } = request.tenantContext!;
      const asset = await updateSiteAssetAlt(
        tenant_id,
        tenant_slug,
        id,
        typeof alt === "string" ? alt : "",
      );
      if (!asset) return sendCodedError(reply, 404, "site.asset_not_found");
      return asset;
    },
  });

  defineRoute(app, {
    method: "DELETE",
    url: "/assets/:id",
    context: "SiteAssetDelete",
    errorCode: "SITE_ASSET_DELETE_FAILED",
    preHandler: [app.requirePermission("site.write")],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const removed = await deleteSiteAsset(
        request.tenantContext!.tenant_id,
        id,
      );
      if (!removed) return sendCodedError(reply, 404, "site.asset_not_found");
      await emitAuditLogFromRequestSafe(app.events, app.log, request, {
        userId: request.authUser!.userId,
        username: request.authUser!.username,
        action: AuditAction.SITE_ASSET_DELETE,
        resource: id,
        detail_key: "marketing.audit.asset_deleted",
      });
      return { deleted: true };
    },
  });

  /* -------------------------------------------------------------- 重定向 */

  defineRoute(app, {
    method: "GET",
    url: "/redirects",
    context: "SiteRedirectList",
    errorCode: "SITE_REDIRECT_LIST_FAILED",
    preHandler: [app.requirePermission("site.read")],
    handler: async (request) =>
      listSiteRedirects(request.tenantContext!.tenant_id),
  });

  /** 按 `from_path` upsert：同一个源只该有一条规则，重复添加即改目标。 */
  defineRoute(app, {
    method: "PUT",
    url: "/redirects",
    context: "SiteRedirectSave",
    errorCode: "SITE_REDIRECT_SAVE_FAILED",
    preHandler: [app.requirePermission("site.write")],
    handler: async (request, reply) => {
      try {
        const redirect = await saveSiteRedirect(
          request.tenantContext!.tenant_id,
          request.body,
        );
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.SITE_REDIRECT_SAVE,
          resource: redirect.id,
          detail_key: "marketing.audit.redirect_saved",
          detail_params: {
            from_path: redirect.from_path,
            to_path: redirect.to_path,
          },
        });
        return redirect;
      } catch (err) {
        if (err instanceof Error && err.message.startsWith("site.")) {
          return sendCodedError(reply, 400, err.message);
        }
        throw err;
      }
    },
  });

  defineRoute(app, {
    method: "DELETE",
    url: "/redirects/:id",
    context: "SiteRedirectDelete",
    errorCode: "SITE_REDIRECT_DELETE_FAILED",
    preHandler: [app.requirePermission("site.write")],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const removed = await deleteSiteRedirect(
        request.tenantContext!.tenant_id,
        id,
      );
      if (!removed) {
        return sendCodedError(reply, 404, "site.redirect_not_found");
      }
      await emitAuditLogFromRequestSafe(app.events, app.log, request, {
        userId: request.authUser!.userId,
        username: request.authUser!.username,
        action: AuditAction.SITE_REDIRECT_DELETE,
        resource: id,
        detail_key: "marketing.audit.redirect_deleted",
      });
      return { deleted: true };
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
