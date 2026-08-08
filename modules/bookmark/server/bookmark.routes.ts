import {
  defineRoute,
  parseSortDir,
  parsePagination,
  sendCodedError,
  AppError,
  emitAuditLogFromRequestSafe,
} from "@be-water/module-sdk/server";

import {
  createBookmark,
  deleteBookmark,
  getBookmark,
  listBookmarks,
  updateBookmark,
} from "./bookmark.service.js";

import type { FastifyInstance } from "fastify";

export async function bookmarkRoutes(app: FastifyInstance): Promise<void> {
  defineRoute(app, {
    method: "GET",
    url: "/",
    context: "BookmarkList",
    errorCode: "BOOKMARK_LIST_FAILED",
    preHandler: [app.requirePermission("bookmark.read")],
    handler: async (request) => {
      const { q, sort_by, sort_dir } = request.query as {
        q?: string;
        sort_by?: string;
        sort_dir?: string;
      };
      const { page, page_size } = parsePagination(
        request.query as Record<string, unknown>,
      );

      return listBookmarks({
        tenant_id: request.tenantContext!.tenant_id,
        page,
        page_size,
        q,
        sort_by,
        sort_dir: parseSortDir(sort_dir),
      });
    },
  });

  defineRoute(app, {
    method: "GET",
    url: "/:bookmark_id",
    context: "BookmarkDetail",
    errorCode: "BOOKMARK_DETAIL_FAILED",
    preHandler: [app.requirePermission("bookmark.read")],
    handler: async (request, reply) => {
      try {
        const { bookmark_id } = request.params as { bookmark_id: string };
        return await getBookmark(request.tenantContext!.tenant_id, bookmark_id);
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
    context: "BookmarkCreate",
    errorCode: "BOOKMARK_CREATE_FAILED",
    preHandler: [app.requirePermission("bookmark.write")],
    handler: async (request, reply) => {
      try {
        const body = request.body as {
          url?: string;
          title?: string;
          description?: string;
        };
        const bookmark = await createBookmark({
          tenant_id: request.tenantContext!.tenant_id,
          user_id: request.authUser!.userId,
          url: body.url ?? "",
          title: body.title ?? "",
          description: body.description,
        });

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "BOOKMARK_CREATE",
          resource: bookmark.id,
          detail_key: "bookmark.audit.created",
          detail_params: { title: bookmark.title },
        });

        return bookmark;
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
    url: "/:bookmark_id",
    context: "BookmarkUpdate",
    errorCode: "BOOKMARK_UPDATE_FAILED",
    preHandler: [app.requirePermission("bookmark.write")],
    handler: async (request, reply) => {
      try {
        const { bookmark_id } = request.params as { bookmark_id: string };
        const body = request.body as {
          url?: string;
          title?: string;
          description?: string;
        };
        const bookmark = await updateBookmark({
          tenant_id: request.tenantContext!.tenant_id,
          user_id: request.authUser!.userId,
          bookmark_id,
          url: body.url,
          title: body.title,
          description: body.description,
        });

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "BOOKMARK_UPDATE",
          resource: bookmark.id,
          detail_key: "bookmark.audit.updated",
          detail_params: { title: bookmark.title },
        });

        return bookmark;
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
    url: "/:bookmark_id",
    context: "BookmarkDelete",
    errorCode: "BOOKMARK_DELETE_FAILED",
    preHandler: [app.requirePermission("bookmark.write")],
    handler: async (request, reply) => {
      try {
        const { bookmark_id } = request.params as { bookmark_id: string };
        const existing = await getBookmark(
          request.tenantContext!.tenant_id,
          bookmark_id,
        );
        await deleteBookmark(request.tenantContext!.tenant_id, bookmark_id);

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "BOOKMARK_DELETE",
          resource: existing.id,
          detail_key: "bookmark.audit.deleted",
          detail_params: { title: existing.title },
        });

        return { deleted: true };
      } catch (err) {
        if (err instanceof AppError && err.code) {
          return sendCodedError(reply, err.status, err.code, err.params);
        }
        throw err;
      }
    },
  });
}
