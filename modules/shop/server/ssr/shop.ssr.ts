import {
  AppError,
  requestOriginFromHeaders,
  resolveHostTenant,
  resolveRequestHostname,
  resolveRequestLocale,
  translateServerMessage,
} from "@rewindom/module-sdk/server";
import { renderUnavailableHtml } from "@rewindom/builtin/marketing/server/ssr-render.js";
import type { AppLocale } from "@rewindom/module-sdk";

import {
  addToCart,
  applyCartDiscount,
  cartCookieName,
  loadCart,
  mergeGuestCartIntoMember,
  updateCartItem,
} from "../cart/cart.service.js";
import {
  getPublishedProductBySlug,
  listPublishedProducts,
} from "../catalog/catalog.service.js";
import { getPublishedCollectionBySlug } from "../catalog/collection.service.js";
import { isShopEnabled } from "../lib/entitlement.js";
import { createCheckout, getOrderByNumber, listMemberOrders } from "../order/order.service.js";
import { listShippingZones } from "../shipping/shipping.service.js";
import { displayTitle, formatMoney } from "../lib/format.js";
import { cartRequiresShipping } from "../../shared/index.js";
import { SHOP_CART_PAGE_KIND } from "../../shared/cart-section.js";
import { SHOP_CHECKOUT_PAGE_KIND } from "../../shared/checkout-section.js";
import {
  SHOP_MEMBER_ORDERS_PAGE_KIND,
  SHOP_ORDER_PAGE_KIND,
} from "../../shared/order-section.js";
import { SHOP_PRODUCT_PAGE_KIND } from "../../shared/product-section.js";
import {
  SHOP_CART_TEMPLATE_PRESET,
  SHOP_CHECKOUT_TEMPLATE_PRESET,
  SHOP_COLLECTION_PAGE_KIND,
  SHOP_COLLECTION_TEMPLATE_PRESET,
  SHOP_INDEX_PAGE_KIND,
  SHOP_INDEX_TEMPLATE_PRESET,
  SHOP_MEMBER_ORDERS_TEMPLATE_PRESET,
  SHOP_ORDER_TEMPLATE_PRESET,
  SHOP_PRODUCT_TEMPLATE_PRESET,
} from "../../shared/shop-page-templates.js";
import {
  SHOP_CART_PATH,
  SHOP_CHECKOUT_PATH,
  SHOP_COLLECTION_PATH,
  SHOP_INDEX_PATH,
  SHOP_MEMBER_ORDERS_PATH,
} from "../../shared/shop-section-context.js";
import { renderShopTemplatePage } from "./shop-page.js";
import {
  buildShopContext,
  emptyCheckoutValues,
  toCartView,
  toCheckoutView,
  toMemberOrderView,
  toOrderView,
  toProductCard,
  toProductDetail,
} from "./shop-view.js";

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { PagePreset } from "@rewindom/builtin/marketing/shared/page-presets.types.js";
import type { ShopRenderContext } from "../../shared/shop-section-context.js";

const GUEST_ORDER_COOKIE = "shop_guest_token";

function requestOrigin(request: FastifyRequest): string {
  return (
    requestOriginFromHeaders(request) ?? `http://${request.hostname}`
  );
}

async function ensureHostTenant(request: FastifyRequest): Promise<void> {
  if (request.hostTenantContext !== undefined) return;
  request.hostTenantContext = await resolveHostTenant(
    resolveRequestHostname(request.headers),
  );
}

function sendHtml(reply: FastifyReply, status: number, html: string): void {
  void reply
    .status(status)
    .header("content-type", "text/html; charset=utf-8")
    .header("cache-control", "private, no-store")
    .send(html);
}

function originHostname(origin: string | undefined): string {
  if (!origin) return "";
  try {
    return new URL(origin).hostname;
  } catch {
    return "";
  }
}

function assertSameOrigin(request: FastifyRequest): void {
  const expected =
    resolveRequestHostname(request.headers) || request.hostname || "";
  const actual = originHostname(request.headers.origin);
  if (!actual || !expected || actual !== expected) {
    throw new AppError({ code: "shop.form_origin_invalid", status: 403 });
  }
}

function formBodyParser(app: FastifyInstance): void {
  app.addContentTypeParser(
    "application/x-www-form-urlencoded",
    { parseAs: "string" },
    (_request, body, done) => {
      const params = new URLSearchParams(String(body ?? ""));
      const result: Record<string, string> = {};
      for (const [key, value] of params.entries()) {
        result[key] = value;
      }
      done(null, result);
    },
  );
}

function readCookie(request: FastifyRequest, name: string): string | undefined {
  const header = request.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

function setCookie(
  reply: FastifyReply,
  name: string,
  value: string,
  maxAge = 60 * 60 * 24 * 30,
): void {
  const pieces = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  const prev = reply.getHeader("set-cookie");
  const next = Array.isArray(prev)
    ? [...prev, pieces.join("; ")]
    : prev
      ? [String(prev), pieces.join("; ")]
      : pieces.join("; ");
  void reply.header("set-cookie", next);
}

async function resolveMember(
  app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
  tenantId: string,
): Promise<{ id: string; email: string; display_name: string } | null> {
  const provider = app.registry.getSiteMemberSessionProvider();
  if (!provider) return null;
  return provider.resolve({ request, reply, tenantId });
}

function errorText(error: unknown, locale: AppLocale): string {
  const code =
    error instanceof AppError && error.code ? error.code : "common.internal_error";
  return translateServerMessage(locale, { code, message: code });
}

export async function shopStorefrontRoutes(app: FastifyInstance): Promise<void> {
  formBodyParser(app);

  async function withShop(
    request: FastifyRequest,
    reply: FastifyReply,
    run: (ctx: {
      tenantId: string;
      tenantSlug: string;
      siteName: string;
      locale: AppLocale;
      member: { id: string; email: string; display_name: string } | null;
    }) => Promise<void>,
  ): Promise<void> {
    await ensureHostTenant(request);
    const host = request.hostTenantContext;
    if (!host) {
      sendHtml(
        reply,
        404,
        renderUnavailableHtml({
          title: "Site not found",
          message: "This host is not bound to a site.",
        }),
      );
      return;
    }
    if (!(await isShopEnabled(host.tenant_id))) {
      sendHtml(
        reply,
        404,
        renderUnavailableHtml({
          title: "Not found",
          message: "This shop is not available.",
        }),
      );
      return;
    }
    const locale = resolveRequestLocale(request);
    const member = await resolveMember(app, request, reply, host.tenant_id);
    await run({
      tenantId: host.tenant_id,
      tenantSlug: host.tenant_slug,
      siteName: host.name,
      locale,
      member,
    });
  }

  async function currentCart(
    tenantId: string,
    request: FastifyRequest,
    reply: FastifyReply,
    memberId: string | null,
    locale: AppLocale,
  ) {
    const cookieId = readCookie(request, cartCookieName());
    if (memberId && cookieId) {
      const merged = await mergeGuestCartIntoMember({
        tenant_id: tenantId,
        guest_cart_id: cookieId,
        member_id: memberId,
        locale,
      });
      setCookie(reply, cartCookieName(), merged.id);
      return merged;
    }
    const cart = await loadCart({
      tenant_id: tenantId,
      cart_id: cookieId,
      member_id: memberId,
      locale,
    });
    setCookie(reply, cartCookieName(), cart.id);
    return cart;
  }

  async function sendShopPage(
    request: FastifyRequest,
    reply: FastifyReply,
    host: {
      tenantId: string;
      tenantSlug: string;
      siteName: string;
      locale: AppLocale;
    },
    spec: {
      kind: string;
      path: string;
      preset: PagePreset;
      shop: ShopRenderContext;
      title?: string;
      description?: string;
      noindex?: boolean;
      status?: number;
    },
  ): Promise<void> {
    sendHtml(
      reply,
      spec.status ?? 200,
      await renderShopTemplatePage({
        tenantId: host.tenantId,
        tenantSlug: host.tenantSlug,
        siteName: host.siteName,
        origin: requestOrigin(request),
        locale: host.locale,
        kind: spec.kind,
        path: spec.path,
        preset: spec.preset,
        shop: spec.shop,
        title: spec.title,
        description: spec.description,
        noindex: spec.noindex,
      }),
    );
  }

  app.get(SHOP_INDEX_PATH, async (request, reply) => {
    await withShop(request, reply, async (host) => {
      const cart = await currentCart(
        host.tenantId,
        request,
        reply,
        host.member?.id ?? null,
        host.locale,
      );
      const products = await listPublishedProducts(host.tenantId);
      await sendShopPage(request, reply, host, {
        kind: SHOP_INDEX_PAGE_KIND,
        path: SHOP_INDEX_PATH,
        preset: SHOP_INDEX_TEMPLATE_PRESET,
        shop: buildShopContext({
          products: products.map((product) => toProductCard(product, host.locale)),
          cart: toCartView(cart, host.locale),
        }),
      });
    });
  });

  app.get(SHOP_CART_PATH, async (request, reply) => {
    await withShop(request, reply, async (host) => {
      const cart = await currentCart(
        host.tenantId,
        request,
        reply,
        host.member?.id ?? null,
        host.locale,
      );
      await sendShopPage(request, reply, host, {
        kind: SHOP_CART_PAGE_KIND,
        path: SHOP_CART_PATH,
        preset: SHOP_CART_TEMPLATE_PRESET,
        noindex: true,
        shop: buildShopContext({ cart: toCartView(cart, host.locale) }),
      });
    });
  });

  app.post(SHOP_CART_PATH, async (request, reply) => {
    await withShop(request, reply, async (host) => {
      assertSameOrigin(request);
      const cart = await currentCart(
        host.tenantId,
        request,
        reply,
        host.member?.id ?? null,
        host.locale,
      );
      const body = request.body as Record<string, string>;
      try {
        if (body.intent === "update") {
          await updateCartItem({
            tenant_id: host.tenantId,
            cart_id: cart.id,
            item_id: body.item_id,
            quantity: Number(body.quantity),
            locale: host.locale,
          });
        } else if (body.intent === "discount") {
          await applyCartDiscount({
            tenant_id: host.tenantId,
            cart_id: cart.id,
            code: body.code ?? "",
            locale: host.locale,
          });
        } else {
          await addToCart({
            tenant_id: host.tenantId,
            cart_id: cart.id,
            variant_id: body.variant_id,
            quantity: Number(body.quantity ?? "1"),
            locale: host.locale,
          });
        }
        void reply.redirect(SHOP_CART_PATH, 303);
      } catch (err) {
        const latest = await loadCart({
          tenant_id: host.tenantId,
          cart_id: cart.id,
          locale: host.locale,
        });
        await sendShopPage(request, reply, host, {
          kind: SHOP_CART_PAGE_KIND,
          path: SHOP_CART_PATH,
          preset: SHOP_CART_TEMPLATE_PRESET,
          noindex: true,
          status: err instanceof AppError ? err.status : 400,
          shop: buildShopContext({
            cart: toCartView(latest, host.locale),
            error: errorText(err, host.locale),
          }),
        });
      }
    });
  });

  app.get(SHOP_CHECKOUT_PATH, async (request, reply) => {
    await withShop(request, reply, async (host) => {
      const cart = await currentCart(
        host.tenantId,
        request,
        reply,
        host.member?.id ?? null,
        host.locale,
      );
      const query = request.query as { canceled?: string };
      const needsShipping = cartRequiresShipping(cart.items);
      const zones = needsShipping ? await listShippingZones(host.tenantId) : [];
      const rates = zones.flatMap((zone) =>
        zone.rates.map((rate) => ({
          id: rate.id,
          label: `${zone.name} · ${rate.name}`,
          price: formatMoney(rate.price_cents, cart.currency, host.locale),
        })),
      );
      await sendShopPage(request, reply, host, {
        kind: SHOP_CHECKOUT_PAGE_KIND,
        path: SHOP_CHECKOUT_PATH,
        preset: SHOP_CHECKOUT_TEMPLATE_PRESET,
        noindex: true,
        shop: buildShopContext({
          cart: toCartView(cart, host.locale),
          checkout: toCheckoutView({
            email: host.member?.email ?? "",
            rates,
            canceled: query.canceled === "1",
            requires_shipping: needsShipping,
          }),
        }),
      });
    });
  });

  app.post(SHOP_CHECKOUT_PATH, async (request, reply) => {
    await withShop(request, reply, async (host) => {
      assertSameOrigin(request);
      const cart = await currentCart(
        host.tenantId,
        request,
        reply,
        host.member?.id ?? null,
        host.locale,
      );
      const body = request.body as Record<string, string>;
      if (body.intent === "discount") {
        try {
          await applyCartDiscount({
            tenant_id: host.tenantId,
            cart_id: cart.id,
            code: body.code ?? "",
            locale: host.locale,
          });
          void reply.redirect(SHOP_CHECKOUT_PATH, 303);
        } catch (err) {
          const latest = await loadCart({
            tenant_id: host.tenantId,
            cart_id: cart.id,
            locale: host.locale,
          });
          const zones = cartRequiresShipping(latest.items)
            ? await listShippingZones(host.tenantId)
            : [];
          const rates = zones.flatMap((zone) =>
            zone.rates.map((rate) => ({
              id: rate.id,
              label: `${zone.name} · ${rate.name}`,
              price: formatMoney(rate.price_cents, latest.currency, host.locale),
            })),
          );
          await sendShopPage(request, reply, host, {
            kind: SHOP_CHECKOUT_PAGE_KIND,
            path: SHOP_CHECKOUT_PATH,
            preset: SHOP_CHECKOUT_TEMPLATE_PRESET,
            noindex: true,
            status: err instanceof AppError ? err.status : 400,
            shop: buildShopContext({
              cart: toCartView(latest, host.locale),
              error: errorText(err, host.locale),
              checkout: toCheckoutView({
                email: host.member?.email ?? "",
                rates,
                requires_shipping: cartRequiresShipping(latest.items),
              }),
            }),
          });
        }
        return;
      }
      try {
        const result = await createCheckout({
          tenant_id: host.tenantId,
          cart_id: cart.id,
          member_id: host.member?.id ?? null,
          locale: host.locale,
          origin: requestOrigin(request),
          body: {
            email: body.email,
            shipping_rate_id: body.shipping_rate_id,
            note: body.note,
            shipping_address: {
              name: body.name,
              line1: body.line1,
              city: body.city,
              state: body.state,
              postal_code: body.postal_code,
              country: body.country,
              phone: body.phone,
            },
          },
        });
        setCookie(reply, GUEST_ORDER_COOKIE, result.guest_token);
        void reply.redirect(result.checkout_url, 303);
      } catch (err) {
        request.log.warn(
          {
            error: err instanceof Error ? err.message : String(err),
            code: err instanceof AppError ? err.code : undefined,
          },
          "ShopCheckout",
        );
        const latest = await loadCart({
          tenant_id: host.tenantId,
          cart_id: cart.id,
          locale: host.locale,
        });
        const zones = cartRequiresShipping(latest.items)
          ? await listShippingZones(host.tenantId)
          : [];
        const rates = zones.flatMap((zone) =>
          zone.rates.map((rate) => ({
            id: rate.id,
            label: `${zone.name} · ${rate.name}`,
            price: formatMoney(rate.price_cents, latest.currency, host.locale),
          })),
        );
        await sendShopPage(request, reply, host, {
          kind: SHOP_CHECKOUT_PAGE_KIND,
          path: SHOP_CHECKOUT_PATH,
          preset: SHOP_CHECKOUT_TEMPLATE_PRESET,
          noindex: true,
          status: err instanceof AppError ? err.status : 400,
          shop: buildShopContext({
            cart: toCartView(latest, host.locale),
            error: errorText(err, host.locale),
            checkout: toCheckoutView({
              email: body.email ?? host.member?.email ?? "",
              rates,
              requires_shipping: cartRequiresShipping(latest.items),
              values: {
                ...emptyCheckoutValues(body.email ?? ""),
                name: body.name ?? "",
                line1: body.line1 ?? "",
                city: body.city ?? "",
                state: body.state ?? "",
                postal_code: body.postal_code ?? "",
                country: body.country ?? "",
                phone: body.phone ?? "",
                shipping_rate_id: body.shipping_rate_id ?? "",
                note: body.note ?? "",
              },
            }),
          }),
        });
      }
    });
  });

  app.get("/shop/orders/:orderNumber", async (request, reply) => {
    await withShop(request, reply, async (host) => {
      const { orderNumber } = request.params as { orderNumber: string };
      const cart = await currentCart(
        host.tenantId,
        request,
        reply,
        host.member?.id ?? null,
        host.locale,
      );
      const path = `/shop/orders/${encodeURIComponent(orderNumber)}`;
      try {
        const order = await getOrderByNumber({
          tenant_id: host.tenantId,
          number: orderNumber,
          guest_token: readCookie(request, GUEST_ORDER_COOKIE),
          member_id: host.member?.id ?? null,
        });
        await sendShopPage(request, reply, host, {
          kind: SHOP_ORDER_PAGE_KIND,
          path,
          preset: SHOP_ORDER_TEMPLATE_PRESET,
          noindex: true,
          title: order.number,
          shop: buildShopContext({
            cart: toCartView(cart, host.locale),
            order: toOrderView(order, host.locale),
          }),
        });
      } catch (err) {
        await sendShopPage(request, reply, host, {
          kind: SHOP_ORDER_PAGE_KIND,
          path,
          preset: SHOP_ORDER_TEMPLATE_PRESET,
          noindex: true,
          status: 404,
          shop: buildShopContext({
            cart: toCartView(cart, host.locale),
            error: errorText(err, host.locale),
          }),
        });
      }
    });
  });

  app.get(SHOP_MEMBER_ORDERS_PATH, async (request, reply) => {
    await withShop(request, reply, async (host) => {
      if (!host.member) {
        void reply.redirect(
          `/member/login?redirect=${encodeURIComponent(SHOP_MEMBER_ORDERS_PATH)}`,
          303,
        );
        return;
      }
      const cart = await currentCart(
        host.tenantId,
        request,
        reply,
        host.member.id,
        host.locale,
      );
      const orders = await listMemberOrders({
        tenant_id: host.tenantId,
        member_id: host.member.id,
      });
      await sendShopPage(request, reply, host, {
        kind: SHOP_MEMBER_ORDERS_PAGE_KIND,
        path: SHOP_MEMBER_ORDERS_PATH,
        preset: SHOP_MEMBER_ORDERS_TEMPLATE_PRESET,
        noindex: true,
        shop: buildShopContext({
          cart: toCartView(cart, host.locale),
          orders: orders.map((order) => toMemberOrderView(order, host.locale)),
        }),
      });
    });
  });

  app.get(SHOP_COLLECTION_PATH, async (request, reply) => {
    await withShop(request, reply, async (host) => {
      const { slug } = request.params as { slug: string };
      const cart = await currentCart(
        host.tenantId,
        request,
        reply,
        host.member?.id ?? null,
        host.locale,
      );
      const products = await listPublishedProducts(host.tenantId);
      const path = `/shop/collections/${encodeURIComponent(slug)}`;
      try {
        const collection = await getPublishedCollectionBySlug(
          host.tenantId,
          slug,
        );
        const title =
          displayTitle(collection.seo_title, host.locale) ||
          displayTitle(collection.title, host.locale, collection.slug);
        const description =
          displayTitle(collection.seo_description, host.locale) ||
          displayTitle(collection.description, host.locale);
        await sendShopPage(request, reply, host, {
          kind: SHOP_COLLECTION_PAGE_KIND,
          path,
          preset: SHOP_COLLECTION_TEMPLATE_PRESET,
          title,
          description,
          shop: buildShopContext({
            products: products.map((product) =>
              toProductCard(product, host.locale),
            ),
            cart: toCartView(cart, host.locale),
            collection_slug: collection.slug,
          }),
        });
      } catch (err) {
        await sendShopPage(request, reply, host, {
          kind: SHOP_COLLECTION_PAGE_KIND,
          path,
          preset: SHOP_COLLECTION_TEMPLATE_PRESET,
          status: 404,
          shop: buildShopContext({
            cart: toCartView(cart, host.locale),
            error: errorText(err, host.locale),
          }),
        });
      }
    });
  });

  app.get("/shop/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    if (["cart", "checkout", "orders", "collections"].includes(slug)) return;
    await withShop(request, reply, async (host) => {
      const cart = await currentCart(
        host.tenantId,
        request,
        reply,
        host.member?.id ?? null,
        host.locale,
      );
      const path = `${SHOP_INDEX_PATH}/${encodeURIComponent(slug)}`;
      try {
        const product = await getPublishedProductBySlug(host.tenantId, slug);
        const title =
          displayTitle(product.seo_title, host.locale) ||
          displayTitle(product.title, host.locale, product.slug);
        const description =
          displayTitle(product.seo_description, host.locale) ||
          displayTitle(product.description, host.locale);
        await sendShopPage(request, reply, host, {
          kind: SHOP_PRODUCT_PAGE_KIND,
          path,
          preset: SHOP_PRODUCT_TEMPLATE_PRESET,
          title,
          description,
          shop: buildShopContext({
            cart: toCartView(cart, host.locale),
            product: toProductDetail(product, host.locale),
          }),
        });
      } catch (err) {
        await sendShopPage(request, reply, host, {
          kind: SHOP_PRODUCT_PAGE_KIND,
          path,
          preset: SHOP_PRODUCT_TEMPLATE_PRESET,
          status: 404,
          shop: buildShopContext({
            cart: toCartView(cart, host.locale),
            error: errorText(err, host.locale),
          }),
        });
      }
    });
  });
}
