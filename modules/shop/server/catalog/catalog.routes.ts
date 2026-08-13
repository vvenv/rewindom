import {
  AppError,
  defineRoute,
  emitAuditLogFromRequestSafe,
  parsePagination,
  parseSortDir,
  resolveRequestLocale,
  sendCodedError,
} from "@be-water/module-sdk/server";

import {
  addVariant,
  createProduct,
  deleteProduct,
  deleteVariant,
  getProduct,
  listProducts,
  updateProduct,
  updateVariant,
} from "./catalog.service.js";

import type {
  CreateShopProductBody,
  ShopVariantInput,
  UpdateShopProductBody,
  UpdateShopVariantBody,
} from "../../shared/index.js";
import type { FastifyInstance } from "fastify";

export async function catalogRoutes(app: FastifyInstance): Promise<void> {
  defineRoute(app, {
    method: "GET",
    url: "/products",
    context: "ShopProductList",
    errorCode: "SHOP_PRODUCT_LIST_FAILED",
    preHandler: [app.requirePermission("shop.read")],
    handler: async (request) => {
      const query = request.query as {
        q?: string;
        status?: string;
        sort_by?: string;
        sort_dir?: string;
      };
      const { page, page_size } = parsePagination(
        request.query as Record<string, unknown>,
      );
      return listProducts({
        tenant_id: request.tenantContext!.tenant_id,
        page,
        page_size,
        q: query.q,
        status: query.status,
        sort_by: query.sort_by,
        sort_dir: parseSortDir(query.sort_dir),
        locale: resolveRequestLocale(request),
      });
    },
  });

  defineRoute(app, {
    method: "GET",
    url: "/products/:product_id",
    context: "ShopProductDetail",
    errorCode: "SHOP_PRODUCT_DETAIL_FAILED",
    preHandler: [app.requirePermission("shop.read")],
    handler: async (request, reply) => {
      try {
        const { product_id } = request.params as { product_id: string };
        return await getProduct(request.tenantContext!.tenant_id, product_id);
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
    url: "/products",
    context: "ShopProductCreate",
    errorCode: "SHOP_PRODUCT_CREATE_FAILED",
    preHandler: [app.requirePermission("shop.write")],
    handler: async (request, reply) => {
      try {
        const product = await createProduct({
          tenant_id: request.tenantContext!.tenant_id,
          user_id: request.authUser!.userId,
          locale: resolveRequestLocale(request),
          body: request.body as CreateShopProductBody,
        });
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "SHOP_PRODUCT_CREATE",
          resource: product.id,
          detail_key: "shop.audit.product_created",
          detail_params: { slug: product.slug },
        });
        return product;
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
    url: "/products/:product_id",
    context: "ShopProductUpdate",
    errorCode: "SHOP_PRODUCT_UPDATE_FAILED",
    preHandler: [app.requirePermission("shop.write")],
    handler: async (request, reply) => {
      try {
        const { product_id } = request.params as { product_id: string };
        const product = await updateProduct({
          tenant_id: request.tenantContext!.tenant_id,
          user_id: request.authUser!.userId,
          product_id,
          locale: resolveRequestLocale(request),
          body: request.body as UpdateShopProductBody,
        });
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "SHOP_PRODUCT_UPDATE",
          resource: product.id,
          detail_key: "shop.audit.product_updated",
          detail_params: { slug: product.slug },
        });
        return product;
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
    url: "/products/:product_id",
    context: "ShopProductDelete",
    errorCode: "SHOP_PRODUCT_DELETE_FAILED",
    preHandler: [app.requirePermission("shop.write")],
    handler: async (request, reply) => {
      try {
        const { product_id } = request.params as { product_id: string };
        const existing = await getProduct(
          request.tenantContext!.tenant_id,
          product_id,
        );
        await deleteProduct(request.tenantContext!.tenant_id, product_id);
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "SHOP_PRODUCT_DELETE",
          resource: existing.id,
          detail_key: "shop.audit.product_deleted",
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

  defineRoute(app, {
    method: "POST",
    url: "/products/:product_id/variants",
    context: "ShopVariantCreate",
    errorCode: "SHOP_VARIANT_CREATE_FAILED",
    preHandler: [app.requirePermission("shop.write")],
    handler: async (request, reply) => {
      try {
        const { product_id } = request.params as { product_id: string };
        const product = await addVariant({
          tenant_id: request.tenantContext!.tenant_id,
          product_id,
          body: request.body as ShopVariantInput,
        });
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "SHOP_PRODUCT_UPDATE",
          resource: product.id,
          detail_key: "shop.audit.product_updated",
          detail_params: { slug: product.slug },
        });
        return product;
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
    url: "/products/:product_id/variants/:variant_id",
    context: "ShopVariantUpdate",
    errorCode: "SHOP_VARIANT_UPDATE_FAILED",
    preHandler: [app.requirePermission("shop.write")],
    handler: async (request, reply) => {
      try {
        const { product_id, variant_id } = request.params as {
          product_id: string;
          variant_id: string;
        };
        return await updateVariant({
          tenant_id: request.tenantContext!.tenant_id,
          product_id,
          variant_id,
          body: request.body as UpdateShopVariantBody,
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
    method: "DELETE",
    url: "/products/:product_id/variants/:variant_id",
    context: "ShopVariantDelete",
    errorCode: "SHOP_VARIANT_DELETE_FAILED",
    preHandler: [app.requirePermission("shop.write")],
    handler: async (request, reply) => {
      try {
        const { product_id, variant_id } = request.params as {
          product_id: string;
          variant_id: string;
        };
        return await deleteVariant({
          tenant_id: request.tenantContext!.tenant_id,
          product_id,
          variant_id,
        });
      } catch (err) {
        if (err instanceof AppError && err.code) {
          return sendCodedError(reply, err.status, err.code, err.params);
        }
        throw err;
      }
    },
  });
}
