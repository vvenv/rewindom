import { Readable } from "node:stream";

import {
  AppError,
  defineRoute,
  emitAuditLogFromRequestSafe,
  parsePagination,
  parseSortDir,
  sendCodedError,
} from "@be-water/module-sdk/server";
import Stripe from "stripe";

import {
  completeOrder,
  fulfillOrder,
  getOrder,
  listOrders,
  markOrderPaid,
  cancelUnpaidOrder,
  peekStripeTenantId,
} from "../order/order.service.js";
import { resolveShopStripeCredentials } from "../payment/credentials.js";
import {
  getShopProviderStatus,
  getShopSetting,
  updateShopProvider,
  updateShopSetting,
} from "../payment/credentials.js";
import {
  createShippingRate,
  createShippingZone,
  deleteShippingRate,
  deleteShippingZone,
  listShippingZones,
  updateShippingRate,
  updateShippingZone,
} from "../shipping/shipping.service.js";

import type {
  CreateShopShippingRateBody,
  CreateShopShippingZoneBody,
  FulfillShopOrderBody,
  UpdateShopProviderBody,
  UpdateShopSettingBody,
  UpdateShopShippingRateBody,
  UpdateShopShippingZoneBody,
} from "../../shared/index.js";
import type { FastifyInstance, FastifyRequest } from "fastify";

type RequestWithRawBody = FastifyRequest & { rawBody?: string };

async function captureRawBody(
  request: FastifyRequest,
  _reply: unknown,
  payload: NodeJS.ReadableStream,
): Promise<Readable> {
  const chunks: Buffer[] = [];
  for await (const chunk of payload) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks);
  (request as RequestWithRawBody).rawBody = raw.toString("utf8");
  return Readable.from(raw);
}

export async function shopAdminRoutes(app: FastifyInstance): Promise<void> {
  defineRoute(app, {
    method: "GET",
    url: "/orders",
    context: "ShopOrderList",
    errorCode: "SHOP_ORDER_LIST_FAILED",
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
      return listOrders({
        tenant_id: request.tenantContext!.tenant_id,
        page,
        page_size,
        q: query.q,
        status: query.status,
        sort_by: query.sort_by,
        sort_dir: parseSortDir(query.sort_dir),
      });
    },
  });

  defineRoute(app, {
    method: "GET",
    url: "/orders/:order_id",
    context: "ShopOrderDetail",
    errorCode: "SHOP_ORDER_DETAIL_FAILED",
    preHandler: [app.requirePermission("shop.read")],
    handler: async (request, reply) => {
      try {
        const { order_id } = request.params as { order_id: string };
        return await getOrder(request.tenantContext!.tenant_id, order_id);
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
    url: "/orders/:order_id/fulfill",
    context: "ShopOrderFulfill",
    errorCode: "SHOP_ORDER_FULFILL_FAILED",
    preHandler: [app.requirePermission("shop.write")],
    handler: async (request, reply) => {
      try {
        const { order_id } = request.params as { order_id: string };
        const order = await fulfillOrder({
          tenant_id: request.tenantContext!.tenant_id,
          order_id,
          body: request.body as FulfillShopOrderBody,
        });
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "SHOP_ORDER_FULFILL",
          resource: order.id,
          detail_key: "shop.audit.order_fulfilled",
          detail_params: { number: order.number },
        });
        return order;
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
    url: "/orders/:order_id/complete",
    context: "ShopOrderComplete",
    errorCode: "SHOP_ORDER_COMPLETE_FAILED",
    preHandler: [app.requirePermission("shop.write")],
    handler: async (request, reply) => {
      try {
        const { order_id } = request.params as { order_id: string };
        return await completeOrder(request.tenantContext!.tenant_id, order_id);
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
    url: "/shipping-zones",
    context: "ShopShippingList",
    errorCode: "SHOP_SHIPPING_LIST_FAILED",
    preHandler: [app.requirePermission("shop.read")],
    handler: async (request) =>
      listShippingZones(request.tenantContext!.tenant_id),
  });

  defineRoute(app, {
    method: "POST",
    url: "/shipping-zones",
    context: "ShopShippingZoneCreate",
    errorCode: "SHOP_SHIPPING_ZONE_CREATE_FAILED",
    preHandler: [app.requirePermission("shop.write")],
    handler: async (request, reply) => {
      try {
        const zone = await createShippingZone(
          request.tenantContext!.tenant_id,
          request.body as CreateShopShippingZoneBody,
        );
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "SHOP_SHIPPING_SAVE",
          resource: zone.id,
          detail_key: "shop.audit.shipping_saved",
          detail_params: { name: zone.name },
        });
        return zone;
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
    url: "/shipping-zones/:zone_id",
    context: "ShopShippingZoneUpdate",
    errorCode: "SHOP_SHIPPING_ZONE_UPDATE_FAILED",
    preHandler: [app.requirePermission("shop.write")],
    handler: async (request, reply) => {
      try {
        const { zone_id } = request.params as { zone_id: string };
        return await updateShippingZone(
          request.tenantContext!.tenant_id,
          zone_id,
          request.body as UpdateShopShippingZoneBody,
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
    method: "DELETE",
    url: "/shipping-zones/:zone_id",
    context: "ShopShippingZoneDelete",
    errorCode: "SHOP_SHIPPING_ZONE_DELETE_FAILED",
    preHandler: [app.requirePermission("shop.write")],
    handler: async (request, reply) => {
      try {
        const { zone_id } = request.params as { zone_id: string };
        await deleteShippingZone(request.tenantContext!.tenant_id, zone_id);
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
    url: "/shipping-zones/:zone_id/rates",
    context: "ShopShippingRateCreate",
    errorCode: "SHOP_SHIPPING_RATE_CREATE_FAILED",
    preHandler: [app.requirePermission("shop.write")],
    handler: async (request, reply) => {
      try {
        const { zone_id } = request.params as { zone_id: string };
        return await createShippingRate(
          request.tenantContext!.tenant_id,
          zone_id,
          request.body as CreateShopShippingRateBody,
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
    method: "PATCH",
    url: "/shipping-zones/:zone_id/rates/:rate_id",
    context: "ShopShippingRateUpdate",
    errorCode: "SHOP_SHIPPING_RATE_UPDATE_FAILED",
    preHandler: [app.requirePermission("shop.write")],
    handler: async (request, reply) => {
      try {
        const { zone_id, rate_id } = request.params as {
          zone_id: string;
          rate_id: string;
        };
        return await updateShippingRate(
          request.tenantContext!.tenant_id,
          zone_id,
          rate_id,
          request.body as UpdateShopShippingRateBody,
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
    method: "DELETE",
    url: "/shipping-zones/:zone_id/rates/:rate_id",
    context: "ShopShippingRateDelete",
    errorCode: "SHOP_SHIPPING_RATE_DELETE_FAILED",
    preHandler: [app.requirePermission("shop.write")],
    handler: async (request, reply) => {
      try {
        const { zone_id, rate_id } = request.params as {
          zone_id: string;
          rate_id: string;
        };
        await deleteShippingRate(
          request.tenantContext!.tenant_id,
          zone_id,
          rate_id,
        );
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
    method: "GET",
    url: "/settings",
    context: "ShopSettingGet",
    errorCode: "SHOP_SETTING_GET_FAILED",
    preHandler: [app.requirePermission("shop.read")],
    handler: async (request) => ({
      setting: await getShopSetting(request.tenantContext!.tenant_id),
      provider: await getShopProviderStatus(request.tenantContext!.tenant_id),
    }),
  });

  defineRoute(app, {
    method: "PATCH",
    url: "/settings",
    context: "ShopSettingUpdate",
    errorCode: "SHOP_SETTING_UPDATE_FAILED",
    preHandler: [app.requirePermission("shop.write")],
    handler: async (request, reply) => {
      try {
        const setting = await updateShopSetting(
          request.tenantContext!.tenant_id,
          request.body as UpdateShopSettingBody,
        );
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "SHOP_SETTING_UPDATE",
          resource: request.tenantContext!.tenant_id,
          detail_key: "shop.audit.setting_updated",
          detail_params: { currency: setting.currency },
        });
        return {
          setting,
          provider: await getShopProviderStatus(request.tenantContext!.tenant_id),
        };
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
    url: "/provider",
    context: "ShopProviderUpdate",
    errorCode: "SHOP_PROVIDER_UPDATE_FAILED",
    preHandler: [app.requirePermission("shop.write")],
    handler: async (request, reply) => {
      try {
        const provider = await updateShopProvider(
          request.tenantContext!.tenant_id,
          request.body as UpdateShopProviderBody,
        );
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "SHOP_PROVIDER_UPDATE",
          resource: request.tenantContext!.tenant_id,
          detail_key: "shop.audit.provider_updated",
          detail_params: { source: provider.source },
        });
        return provider;
      } catch (err) {
        if (err instanceof AppError && err.code) {
          return sendCodedError(reply, err.status, err.code, err.params);
        }
        throw err;
      }
    },
  });
}

export async function shopWebhookRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preParsing", captureRawBody);

  defineRoute(app, {
    method: "POST",
    url: "/stripe",
    context: "ShopStripeWebhook",
    errorCode: "SHOP_STRIPE_WEBHOOK_FAILED",
    handler: async (request, reply) => {
      const raw = (request as RequestWithRawBody).rawBody;
      const signature = request.headers["stripe-signature"];
      if (!raw || typeof signature !== "string") {
        return sendCodedError(reply, 400, "shop.webhook_invalid");
      }

      let unverified: Stripe.Event;
      try {
        unverified = JSON.parse(raw) as Stripe.Event;
      } catch {
        return sendCodedError(reply, 400, "shop.webhook_invalid");
      }
      const tenantId = peekStripeTenantId(unverified);
      if (!tenantId) {
        return sendCodedError(reply, 400, "shop.webhook_tenant_missing");
      }
      const credentials = await resolveShopStripeCredentials(tenantId);
      if (!credentials?.webhookSecret) {
        return sendCodedError(reply, 400, "shop.stripe_unconfigured");
      }
      const stripe = new Stripe(credentials.secretKey);
      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(
          raw,
          signature,
          credentials.webhookSecret,
        );
      } catch {
        return sendCodedError(reply, 400, "shop.webhook_invalid");
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const orderId = session.metadata?.order_id;
        if (orderId) {
          await markOrderPaid({
            tenant_id: tenantId,
            order_id: orderId,
            provider_ref: session.id,
            amount_cents: session.amount_total ?? 0,
            tax_cents: session.total_details?.amount_tax ?? undefined,
            cart_id: session.metadata?.cart_id,
            raw_event: event,
          });
        }
      } else if (
        event.type === "checkout.session.expired" ||
        event.type === "checkout.session.async_payment_failed"
      ) {
        const session = event.data.object;
        const orderId = session.metadata?.order_id;
        if (orderId) {
          await cancelUnpaidOrder(tenantId, orderId);
        }
      }

      return { received: true };
    },
  });
}
