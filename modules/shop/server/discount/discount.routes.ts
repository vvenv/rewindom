import {
  AppError,
  defineRoute,
  emitAuditLogFromRequestSafe,
  parsePagination,
  parseSortDir,
  sendCodedError,
} from "@rewindom/module-sdk/server";

import {
  createDiscount,
  deleteDiscount,
  getDiscount,
  listDiscounts,
  updateDiscount,
} from "./discount.service.js";

import type {
  CreateShopDiscountBody,
  UpdateShopDiscountBody,
} from "../../shared/index.js";
import type { FastifyInstance } from "fastify";

export async function discountRoutes(app: FastifyInstance): Promise<void> {
  defineRoute(app, {
    method: "GET",
    url: "/discounts",
    context: "ShopDiscountList",
    errorCode: "SHOP_DISCOUNT_LIST_FAILED",
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
      return listDiscounts({
        tenant_id: request.tenantContext!.tenant_id,
        page,
        page_size,
        q: query.q,
        sort_by: query.sort_by,
        sort_dir: parseSortDir(query.sort_dir),
      });
    },
  });

  defineRoute(app, {
    method: "GET",
    url: "/discounts/:discount_id",
    context: "ShopDiscountDetail",
    errorCode: "SHOP_DISCOUNT_DETAIL_FAILED",
    preHandler: [app.requirePermission("shop.read")],
    handler: async (request, reply) => {
      try {
        const { discount_id } = request.params as { discount_id: string };
        return await getDiscount(request.tenantContext!.tenant_id, discount_id);
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
    url: "/discounts",
    context: "ShopDiscountCreate",
    errorCode: "SHOP_DISCOUNT_CREATE_FAILED",
    preHandler: [app.requirePermission("shop.write")],
    handler: async (request, reply) => {
      try {
        const discount = await createDiscount({
          tenant_id: request.tenantContext!.tenant_id,
          body: request.body as CreateShopDiscountBody,
        });
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "SHOP_DISCOUNT_CREATE",
          resource: discount.id,
          detail_key: "shop.audit.discount_created",
          detail_params: { code: discount.code },
        });
        return discount;
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
    url: "/discounts/:discount_id",
    context: "ShopDiscountUpdate",
    errorCode: "SHOP_DISCOUNT_UPDATE_FAILED",
    preHandler: [app.requirePermission("shop.write")],
    handler: async (request, reply) => {
      try {
        const { discount_id } = request.params as { discount_id: string };
        const discount = await updateDiscount({
          tenant_id: request.tenantContext!.tenant_id,
          discount_id,
          body: request.body as UpdateShopDiscountBody,
        });
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "SHOP_DISCOUNT_UPDATE",
          resource: discount.id,
          detail_key: "shop.audit.discount_updated",
          detail_params: { code: discount.code },
        });
        return discount;
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
    url: "/discounts/:discount_id",
    context: "ShopDiscountDelete",
    errorCode: "SHOP_DISCOUNT_DELETE_FAILED",
    preHandler: [app.requirePermission("shop.write")],
    handler: async (request, reply) => {
      try {
        const { discount_id } = request.params as { discount_id: string };
        const existing = await getDiscount(
          request.tenantContext!.tenant_id,
          discount_id,
        );
        await deleteDiscount(request.tenantContext!.tenant_id, discount_id);
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "SHOP_DISCOUNT_DELETE",
          resource: existing.id,
          detail_key: "shop.audit.discount_deleted",
          detail_params: { code: existing.code },
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
