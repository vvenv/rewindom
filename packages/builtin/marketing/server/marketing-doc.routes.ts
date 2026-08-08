import { defineRoute } from "@be-water/server-kernel/http/define-route.js";
import { parseMultipartFileUploads } from "@be-water/server-kernel/http/multipart-upload.js";
import { sendCodedError } from "@be-water/server-kernel/http/route-error-handler.js";
import { AppError } from "@be-water/server-kernel/lib/app-errors.js";
import { emitAuditLogFromRequestSafe } from "@be-water/server-kernel/runtime/audit-log-emit.js";

import { AuditAction } from "../../audit/shared/index.js";

import {
  createDoc,
  deleteDoc,
  getAllDocsForExport,
  getDoc,
  getDocForExport,
  importDocFile,
  listDocs,
  publishDoc,
  revertDoc,
  unpublishDoc,
  updateDoc,
} from "./marketing-doc.service.js";

import type {
  CreateMarketingDocBody,
  UpdateMarketingDocBody,
} from "../shared/marketing-doc.js";
import type { FastifyInstance } from "fastify";

export async function marketingDocRoutes(app: FastifyInstance): Promise<void> {
  defineRoute(app, {
    method: "GET",
    url: "/docs",
    context: "SiteDocList",
    errorCode: "SITE_DOC_LIST_FAILED",
    preHandler: [app.requirePermission("site.read")],
    handler: async (request) => {
      return listDocs(request.tenantContext!.tenant_id);
    },
  });

  defineRoute(app, {
    method: "GET",
    url: "/docs/:docId",
    context: "SiteDocDetail",
    errorCode: "SITE_DOC_DETAIL_FAILED",
    preHandler: [app.requirePermission("site.read")],
    handler: async (request, reply) => {
      try {
        const { docId } = request.params as { docId: string };
        return await getDoc(request.tenantContext!.tenant_id, docId);
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
    url: "/docs",
    context: "SiteDocCreate",
    errorCode: "SITE_DOC_CREATE_FAILED",
    preHandler: [app.requirePermission("site.write")],
    handler: async (request, reply) => {
      try {
        const body = request.body as CreateMarketingDocBody;
        const doc = await createDoc(request.tenantContext!.tenant_id, body);
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.SITE_DOC_CREATE,
          resource: doc.id,
          detail_key: "marketing.audit.doc_created",
          detail_params: { title: doc.title_draft },
        });
        void reply.code(201);
        return doc;
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
    url: "/docs/:docId",
    context: "SiteDocUpdate",
    errorCode: "SITE_DOC_UPDATE_FAILED",
    preHandler: [app.requirePermission("site.write")],
    handler: async (request, reply) => {
      try {
        const { docId } = request.params as { docId: string };
        const body = request.body as UpdateMarketingDocBody;
        const doc = await updateDoc(
          request.tenantContext!.tenant_id,
          docId,
          body,
        );
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.SITE_DOC_UPDATE,
          resource: doc.id,
          detail_key: "marketing.audit.doc_updated",
          detail_params: { title: doc.title_draft },
        });
        return doc;
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
    url: "/docs/:docId",
    context: "SiteDocDelete",
    errorCode: "SITE_DOC_DELETE_FAILED",
    preHandler: [app.requirePermission("site.write")],
    handler: async (request, reply) => {
      try {
        const { docId } = request.params as { docId: string };
        await deleteDoc(request.tenantContext!.tenant_id, docId);
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.SITE_DOC_DELETE,
          resource: docId,
          detail_key: "marketing.audit.doc_deleted",
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
    url: "/docs/:docId/publish",
    context: "SiteDocPublish",
    errorCode: "SITE_DOC_PUBLISH_FAILED",
    preHandler: [app.requirePermission("site.write")],
    handler: async (request, reply) => {
      try {
        const { docId } = request.params as { docId: string };
        const doc = await publishDoc(request.tenantContext!.tenant_id, docId);
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.SITE_DOC_PUBLISH,
          resource: doc.id,
          detail_key: "marketing.audit.doc_published",
          detail_params: { title: doc.title_draft },
        });
        return doc;
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
    url: "/docs/:docId/unpublish",
    context: "SiteDocUnpublish",
    errorCode: "SITE_DOC_UNPUBLISH_FAILED",
    preHandler: [app.requirePermission("site.write")],
    handler: async (request, reply) => {
      try {
        const { docId } = request.params as { docId: string };
        const doc = await unpublishDoc(request.tenantContext!.tenant_id, docId);
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.SITE_DOC_UNPUBLISH,
          resource: doc.id,
          detail_key: "marketing.audit.doc_unpublished",
          detail_params: { title: doc.title_draft },
        });
        return doc;
      } catch (err) {
        if (err instanceof AppError && err.code) {
          return sendCodedError(reply, err.status, err.code, err.params);
        }
        throw err;
      }
    },
  });

  /** 撤销未发布的更改：草稿列回灌成线上列。 */
  defineRoute(app, {
    method: "POST",
    url: "/docs/:docId/revert",
    context: "SiteDocRevert",
    errorCode: "SITE_DOC_REVERT_FAILED",
    preHandler: [app.requirePermission("site.write")],
    handler: async (request, reply) => {
      try {
        const { docId } = request.params as { docId: string };
        const doc = await revertDoc(request.tenantContext!.tenant_id, docId);
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.SITE_DOC_UPDATE,
          resource: doc.id,
          detail_key: "marketing.audit.doc_updated",
          detail_params: { title: doc.title_draft },
        });
        return doc;
      } catch (err) {
        if (err instanceof AppError && err.code) {
          return sendCodedError(reply, err.status, err.code, err.params);
        }
        throw err;
      }
    },
  });

  /* -------------------------------------------------------------- 导入 */

  /** 导入 `.md` 文件：支持多文件，文件名即 slug，frontmatter 提供标题等。 */
  defineRoute(app, {
    method: "POST",
    url: "/docs/import",
    context: "SiteDocImport",
    errorCode: "SITE_DOC_IMPORT_FAILED",
    preHandler: [app.requirePermission("site.write")],
    handler: async (request, reply) => {
      try {
        const parsed = await parseMultipartFileUploads(request);
        if (!parsed || parsed.files.length === 0) {
          return sendCodedError(reply, 400, "site.doc_import_no_files");
        }
        const tenant_id = request.tenantContext!.tenant_id;
        const results = [];
        for (const file of parsed.files) {
          const raw = file.buffer.toString("utf8");
          const imported = await importDocFile(
            tenant_id,
            file.filename ?? "untitled.md",
            raw,
          );
          await emitAuditLogFromRequestSafe(app.events, app.log, request, {
            userId: request.authUser!.userId,
            username: request.authUser!.username,
            action: AuditAction.SITE_DOC_IMPORT,
            detail_key: "marketing.audit.doc_imported",
            detail_params: { title: imported.title },
          });
          results.push(imported);
        }
        return { imported: results };
      } catch (err) {
        if (err instanceof AppError && err.code) {
          return sendCodedError(reply, err.status, err.code, err.params);
        }
        if (err instanceof Error && err.message.startsWith("site.")) {
          return sendCodedError(reply, 400, err.message);
        }
        throw err;
      }
    },
  });

  /* -------------------------------------------------------------- 导出 */

  /** 导出单篇文档为带 frontmatter 的 `.md` 文本。 */
  defineRoute(app, {
    method: "GET",
    url: "/docs/:docId/export",
    context: "SiteDocExport",
    errorCode: "SITE_DOC_EXPORT_FAILED",
    preHandler: [app.requirePermission("site.read")],
    handler: async (request, reply) => {
      try {
        const { docId } = request.params as { docId: string };
        return await getDocForExport(request.tenantContext!.tenant_id, docId);
      } catch (err) {
        if (err instanceof AppError && err.code) {
          return sendCodedError(reply, err.status, err.code, err.params);
        }
        throw err;
      }
    },
  });

  /** 导出全部文档（草稿内容）。 */
  defineRoute(app, {
    method: "GET",
    url: "/docs-export-all",
    context: "SiteDocExportAll",
    errorCode: "SITE_DOC_EXPORT_ALL_FAILED",
    preHandler: [app.requirePermission("site.read")],
    handler: async (request) => {
      return {
        docs: await getAllDocsForExport(request.tenantContext!.tenant_id),
      };
    },
  });
}
