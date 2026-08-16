import {
  AppError,
  defineRoute,
  emitAuditLogFromRequestSafe,
  parsePagination,
  parseSortDir,
  resolveRequestLocale,
  sendCodedError,
} from "@rewindom/module-sdk/server";

import { resolveCatalogLocale } from "../lib/request-locale.js";

import {
  createCollection,
  deleteCollection,
  getCollection,
  listCollections,
  updateCollection,
} from "./collection.service.js";

import type {
  CreateShopCollectionBody,
  UpdateShopCollectionBody,
} from "../../shared/index.js";
import type { FastifyInstance } from "fastify";

export async function collectionRoutes(app: FastifyInstance): Promise<void> {
  defineRoute(app, {
    method: "GET",
    url: "/collections",
    context: "ShopCollectionList",
    errorCode: "SHOP_COLLECTION_LIST_FAILED",
    preHandler: [app.requirePermission("shop.read")],
    handler: async (request) => {
      const query = request.query as {
        q?: string;
        sort_by?: string;
        sort_dir?: string;
      };
      const { page, page_size } = parsePagination(
        request.query as Record<string, unknown>,
      );
      return listCollections({
        tenant_id: request.tenantContext!.tenant_id,
        page,
        page_size,
        q: query.q,
        sort_by: query.sort_by,
        sort_dir: parseSortDir(query.sort_dir),
        locale: resolveCatalogLocale(request),
      });
    },
  });

  defineRoute(app, {
    method: "GET",
    url: "/collections/:collection_id",
    context: "ShopCollectionDetail",
    errorCode: "SHOP_COLLECTION_DETAIL_FAILED",
    preHandler: [app.requirePermission("shop.read")],
    handler: async (request, reply) => {
      try {
        const { collection_id } = request.params as { collection_id: string };
        return await getCollection(
          request.tenantContext!.tenant_id,
          collection_id,
        );
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
    url: "/collections",
    context: "ShopCollectionCreate",
    errorCode: "SHOP_COLLECTION_CREATE_FAILED",
    preHandler: [app.requirePermission("shop.write")],
    handler: async (request, reply) => {
      try {
        const collection = await createCollection({
          tenant_id: request.tenantContext!.tenant_id,
          locale: resolveRequestLocale(request),
          body: request.body as CreateShopCollectionBody,
        });
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "SHOP_COLLECTION_CREATE",
          resource: collection.id,
          detail_key: "shop.audit.collection_created",
          detail_params: { slug: collection.slug },
        });
        return collection;
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
    url: "/collections/:collection_id",
    context: "ShopCollectionUpdate",
    errorCode: "SHOP_COLLECTION_UPDATE_FAILED",
    preHandler: [app.requirePermission("shop.write")],
    handler: async (request, reply) => {
      try {
        const { collection_id } = request.params as { collection_id: string };
        const collection = await updateCollection({
          tenant_id: request.tenantContext!.tenant_id,
          collection_id,
          locale: resolveRequestLocale(request),
          body: request.body as UpdateShopCollectionBody,
        });
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "SHOP_COLLECTION_UPDATE",
          resource: collection.id,
          detail_key: "shop.audit.collection_updated",
          detail_params: { slug: collection.slug },
        });
        return collection;
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
    url: "/collections/:collection_id",
    context: "ShopCollectionDelete",
    errorCode: "SHOP_COLLECTION_DELETE_FAILED",
    preHandler: [app.requirePermission("shop.write")],
    handler: async (request, reply) => {
      try {
        const { collection_id } = request.params as { collection_id: string };
        const existing = await getCollection(
          request.tenantContext!.tenant_id,
          collection_id,
        );
        await deleteCollection(request.tenantContext!.tenant_id, collection_id);
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "SHOP_COLLECTION_DELETE",
          resource: existing.id,
          detail_key: "shop.audit.collection_deleted",
          detail_params: { slug: existing.slug },
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
