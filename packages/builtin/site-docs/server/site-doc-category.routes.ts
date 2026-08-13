import { defineRoute } from "@rewindom/server-kernel/http/define-route.js";
import { sendCodedError } from "@rewindom/server-kernel/http/route-error-handler.js";
import { AppError } from "@rewindom/server-kernel/lib/app-errors.js";
import { emitAuditLogFromRequestSafe } from "@rewindom/server-kernel/runtime/audit-log-emit.js";

import { AuditAction } from "../../audit/shared/index.js";

import {
  createDocCategory,
  deleteDocCategory,
  listDocCategories,
  reorderDocCategories,
  updateDocCategory,
} from "./site-doc-category.service.js";

import type {
  CreateSiteDocCategoryBody,
  ReorderSiteDocCategoriesBody,
  UpdateSiteDocCategoryBody,
} from "../shared/site-doc-category.js";
import type { FastifyInstance } from "fastify";

export async function siteDocCategoryRoutes(
  app: FastifyInstance,
): Promise<void> {
  defineRoute(app, {
    method: "GET",
    url: "/categories",
    context: "SiteDocCategoryList",
    errorCode: "SITE_DOC_CATEGORY_LIST_FAILED",
    preHandler: [app.requirePermission("docs.read")],
    handler: async (request) => {
      return listDocCategories(request.tenantContext!.tenant_id);
    },
  });

  defineRoute(app, {
    method: "PUT",
    url: "/categories/order",
    context: "SiteDocCategoryReorder",
    errorCode: "SITE_DOC_CATEGORY_REORDER_FAILED",
    preHandler: [app.requirePermission("docs.write")],
    handler: async (request, reply) => {
      try {
        const body = request.body as ReorderSiteDocCategoriesBody;
        const categories = await reorderDocCategories(
          request.tenantContext!.tenant_id,
          body,
        );
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.SITE_DOC_CATEGORY_UPDATE,
          resource: request.tenantContext!.tenant_id,
          detail_key: "site-docs.audit.doc_categories_reordered",
          detail_params: { count: body?.items?.length ?? 0 },
        });
        return categories;
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
    url: "/categories",
    context: "SiteDocCategoryCreate",
    errorCode: "SITE_DOC_CATEGORY_CREATE_FAILED",
    preHandler: [app.requirePermission("docs.write")],
    handler: async (request, reply) => {
      try {
        const body = request.body as CreateSiteDocCategoryBody;
        const category = await createDocCategory(
          request.tenantContext!.tenant_id,
          body,
        );
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.SITE_DOC_CATEGORY_CREATE,
          resource: category.id,
          detail_key: "site-docs.audit.doc_category_created",
          detail_params: { key: category.key },
        });
        void reply.code(201);
        return category;
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
    url: "/categories/:categoryId",
    context: "SiteDocCategoryUpdate",
    errorCode: "SITE_DOC_CATEGORY_UPDATE_FAILED",
    preHandler: [app.requirePermission("docs.write")],
    handler: async (request, reply) => {
      try {
        const { categoryId } = request.params as { categoryId: string };
        const body = request.body as UpdateSiteDocCategoryBody;
        const category = await updateDocCategory(
          request.tenantContext!.tenant_id,
          categoryId,
          body,
        );
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.SITE_DOC_CATEGORY_UPDATE,
          resource: category.id,
          detail_key: "site-docs.audit.doc_category_updated",
          detail_params: { key: category.key },
        });
        return category;
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
    url: "/categories/:categoryId",
    context: "SiteDocCategoryDelete",
    errorCode: "SITE_DOC_CATEGORY_DELETE_FAILED",
    preHandler: [app.requirePermission("docs.write")],
    handler: async (request, reply) => {
      try {
        const { categoryId } = request.params as { categoryId: string };
        await deleteDocCategory(request.tenantContext!.tenant_id, categoryId);
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.SITE_DOC_CATEGORY_DELETE,
          resource: categoryId,
          detail_key: "site-docs.audit.doc_category_deleted",
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
}
