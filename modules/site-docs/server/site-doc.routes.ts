import {
  AppError,
  defineRoute,
  emitAuditLogFromRequestSafe,
  parseMultipartFileUploads,
  parsePagination,
  parseSortDir,
  sendCodedError,
} from "@rewindom/module-sdk/server";

import {
  createDoc,
  deleteDoc,
  duplicateDoc,
  getAllDocsForExport,
  getDoc,
  getDocForExport,
  importDocFile,
  listDocs,
  publishDoc,
  revertDoc,
  unpublishDoc,
  updateDoc,
} from "./site-doc.service.js";

import type {
  CreateSiteDocBody,
  DuplicateSiteDocBody,
  UpdateSiteDocBody,
} from "../shared/site-doc.js";
import type { FastifyInstance } from "fastify";

export async function siteDocRoutes(app: FastifyInstance): Promise<void> {
  defineRoute(app, {
    method: "GET",
    url: "/",
    context: "SiteDocList",
    errorCode: "SITE_DOC_LIST_FAILED",
    preHandler: [app.requirePermission("docs.read")],
    handler: async (request) => {
      const query = request.query as Record<string, string | undefined>;
      const { page, page_size } = parsePagination(query, {
        maxPageSize: 999,
      });
      return listDocs(request.tenantContext!.tenant_id, {
        q: query.q,
        category: query.category,
        status: query.status,
        locale: query.locale,
        page,
        page_size,
        sort_by: query.sort_by,
        sort_dir: parseSortDir(query.sort_dir),
      });
    },
  });

  defineRoute(app, {
    method: "GET",
    url: "/:docId",
    context: "SiteDocDetail",
    errorCode: "SITE_DOC_DETAIL_FAILED",
    preHandler: [app.requirePermission("docs.read")],
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
    url: "/",
    context: "SiteDocCreate",
    errorCode: "SITE_DOC_CREATE_FAILED",
    preHandler: [app.requirePermission("docs.write")],
    handler: async (request, reply) => {
      try {
        const body = request.body as CreateSiteDocBody;
        const doc = await createDoc(request.tenantContext!.tenant_id, body);
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "SITE_DOC_CREATE",
          resource: doc.id,
          detail_key: "site-docs.audit.doc_created",
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
    url: "/:docId",
    context: "SiteDocUpdate",
    errorCode: "SITE_DOC_UPDATE_FAILED",
    preHandler: [app.requirePermission("docs.write")],
    handler: async (request, reply) => {
      try {
        const { docId } = request.params as { docId: string };
        const body = request.body as UpdateSiteDocBody;
        const doc = await updateDoc(
          request.tenantContext!.tenant_id,
          docId,
          body,
        );
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "SITE_DOC_UPDATE",
          resource: doc.id,
          detail_key: "site-docs.audit.doc_updated",
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

  /** 复制文档：主要用来从一种语言快速铺出另一种语言的同一篇内容。 */
  defineRoute(app, {
    method: "POST",
    url: "/:docId/duplicate",
    context: "SiteDocDuplicate",
    errorCode: "SITE_DOC_DUPLICATE_FAILED",
    preHandler: [app.requirePermission("docs.write")],
    handler: async (request, reply) => {
      try {
        const { docId } = request.params as { docId: string };
        const body = request.body as DuplicateSiteDocBody;
        const doc = await duplicateDoc(
          request.tenantContext!.tenant_id,
          docId,
          body,
        );
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "SITE_DOC_CREATE",
          resource: doc.id,
          detail_key: "site-docs.audit.doc_duplicated",
          detail_params: { title: doc.title_draft, source: docId },
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
    method: "DELETE",
    url: "/:docId",
    context: "SiteDocDelete",
    errorCode: "SITE_DOC_DELETE_FAILED",
    preHandler: [app.requirePermission("docs.write")],
    handler: async (request, reply) => {
      try {
        const { docId } = request.params as { docId: string };
        await deleteDoc(request.tenantContext!.tenant_id, docId);
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "SITE_DOC_DELETE",
          resource: docId,
          detail_key: "site-docs.audit.doc_deleted",
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
    url: "/:docId/publish",
    context: "SiteDocPublish",
    errorCode: "SITE_DOC_PUBLISH_FAILED",
    preHandler: [app.requirePermission("docs.write")],
    handler: async (request, reply) => {
      try {
        const { docId } = request.params as { docId: string };
        const doc = await publishDoc(request.tenantContext!.tenant_id, docId);
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "SITE_DOC_PUBLISH",
          resource: doc.id,
          detail_key: "site-docs.audit.doc_published",
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
    url: "/:docId/unpublish",
    context: "SiteDocUnpublish",
    errorCode: "SITE_DOC_UNPUBLISH_FAILED",
    preHandler: [app.requirePermission("docs.write")],
    handler: async (request, reply) => {
      try {
        const { docId } = request.params as { docId: string };
        const doc = await unpublishDoc(request.tenantContext!.tenant_id, docId);
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "SITE_DOC_UNPUBLISH",
          resource: doc.id,
          detail_key: "site-docs.audit.doc_unpublished",
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
    url: "/:docId/revert",
    context: "SiteDocRevert",
    errorCode: "SITE_DOC_REVERT_FAILED",
    preHandler: [app.requirePermission("docs.write")],
    handler: async (request, reply) => {
      try {
        const { docId } = request.params as { docId: string };
        const doc = await revertDoc(request.tenantContext!.tenant_id, docId);
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "SITE_DOC_UPDATE",
          resource: doc.id,
          detail_key: "site-docs.audit.doc_updated",
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
    url: "/import",
    context: "SiteDocImport",
    errorCode: "SITE_DOC_IMPORT_FAILED",
    preHandler: [app.requirePermission("docs.write")],
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
            action: "SITE_DOC_IMPORT",
            detail_key: "site-docs.audit.doc_imported",
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
    url: "/:docId/export",
    context: "SiteDocExport",
    errorCode: "SITE_DOC_EXPORT_FAILED",
    preHandler: [app.requirePermission("docs.read")],
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
    url: "/export-all",
    context: "SiteDocExportAll",
    errorCode: "SITE_DOC_EXPORT_ALL_FAILED",
    preHandler: [app.requirePermission("docs.read")],
    handler: async (request) => {
      return {
        docs: await getAllDocsForExport(request.tenantContext!.tenant_id),
      };
    },
  });
}
