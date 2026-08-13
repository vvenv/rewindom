import {
  AppError,
  resolveHostTenant,
  resolveRequestHostname,
  resolveRequestLocale,
  translateServerMessage,
} from "@rewindom/module-sdk/server";
import type { AppLocale } from "@rewindom/module-sdk";

import {
  addToCart,
  cartCookieName,
  loadCart,
  mergeGuestCartIntoMember,
  updateCartItem,
} from "../cart/cart.service.js";
import {
  getPublishedProductBySlug,
  listPublishedProducts,
} from "../catalog/catalog.service.js";
import { isShopEnabled } from "../lib/entitlement.js";
import { displayTitle, formatMoney } from "../lib/format.js";
import { createCheckout, getOrderByNumber, listMemberOrders } from "../order/order.service.js";
import { listShippingZones } from "../shipping/shipping.service.js";
import {
  cartHtml,
  checkoutHtml,
  memberOrdersHtml,
  orderHtml,
  productDetailHtml,
  productListHtml,
  renderShopHtml,
  renderUnavailable,
} from "./shop-html.js";

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

const GUEST_ORDER_COOKIE = "shop_guest_token";

function requestOrigin(request: FastifyRequest): string {
  const proto =
    (request.headers["x-forwarded-proto"] as string | undefined)
      ?.split(",")[0]
      ?.trim() || "https";
  const host =
    resolveRequestHostname(request.headers) || request.hostname || "localhost";
  return `${proto}://${host}`;
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
  const next = Array.isArray(prev) ? [...prev, pieces.join("; ")] : prev ? [String(prev), pieces.join("; ")] : pieces.join("; ");
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
        renderUnavailable("Site not found", "This host is not bound to a site."),
      );
      return;
    }
    if (!(await isShopEnabled(host.tenant_id))) {
      sendHtml(
        reply,
        404,
        renderUnavailable("Not found", "This shop is not available."),
      );
      return;
    }
    const locale = resolveRequestLocale(request);
    const member = await resolveMember(app, request, reply, host.tenant_id);
    await run({
      tenantId: host.tenant_id,
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

  app.get("/shop", async (request, reply) => {
    await withShop(request, reply, async ({ tenantId, siteName, locale, member }) => {
      const cart = await currentCart(tenantId, request, reply, member?.id ?? null, locale);
      const products = await listPublishedProducts(tenantId);
      sendHtml(
        reply,
        200,
        renderShopHtml({
          locale,
          title: locale === "en" ? "Shop" : "商店",
          siteName,
          cartCount: cart.item_count,
          member,
          body: productListHtml({
            locale,
            products: products.map((product) => {
              const first = product.variants[0];
              return {
                slug: product.slug,
                title: displayTitle(product.title, locale, product.slug),
                price: first
                  ? formatMoney(first.price_cents, first.currency, locale)
                  : "",
              };
            }),
          }),
        }),
      );
    });
  });

  app.get("/shop/cart", async (request, reply) => {
    await withShop(request, reply, async ({ tenantId, siteName, locale, member }) => {
      const cart = await currentCart(tenantId, request, reply, member?.id ?? null, locale);
      sendHtml(
        reply,
        200,
        renderShopHtml({
          locale,
          title: locale === "en" ? "Cart" : "购物车",
          siteName,
          cartCount: cart.item_count,
          member,
          body: cartHtml({
            locale,
            currency: cart.currency,
            items: cart.items.map((item) => ({
              id: item.id,
              title: item.title,
              sku: item.sku,
              quantity: item.quantity,
              line_total: formatMoney(item.line_total_cents, item.currency, locale),
            })),
            subtotal: formatMoney(cart.subtotal_cents, cart.currency, locale),
          }),
        }),
      );
    });
  });

  app.post("/shop/cart", async (request, reply) => {
    await withShop(request, reply, async ({ tenantId, locale, member }) => {
      assertSameOrigin(request);
      const cart = await currentCart(tenantId, request, reply, member?.id ?? null, locale);
      const body = request.body as Record<string, string>;
      if (body.intent === "update") {
        await updateCartItem({
          tenant_id: tenantId,
          cart_id: cart.id,
          item_id: body.item_id,
          quantity: Number(body.quantity),
          locale,
        });
      } else {
        await addToCart({
          tenant_id: tenantId,
          cart_id: cart.id,
          variant_id: body.variant_id,
          quantity: Number(body.quantity ?? "1"),
          locale,
        });
      }
      void reply.redirect("/shop/cart", 303);
    });
  });

  app.get("/shop/checkout", async (request, reply) => {
    await withShop(request, reply, async ({ tenantId, siteName, locale, member }) => {
      const cart = await currentCart(tenantId, request, reply, member?.id ?? null, locale);
      const query = request.query as { canceled?: string };
      const zones = await listShippingZones(tenantId);
      const combined = zones.flatMap((zone) =>
        zone.rates.map((rate) => ({
          id: rate.id,
          label: `${zone.name} · ${rate.name}`,
          price: formatMoney(rate.price_cents, cart.currency, locale),
        })),
      );
      sendHtml(
        reply,
        200,
        renderShopHtml({
          locale,
          title: locale === "en" ? "Checkout" : "结账",
          siteName,
          cartCount: cart.item_count,
          member,
          body: checkoutHtml({
            locale,
            email: member?.email ?? "",
            rates: combined,
            canceled: query.canceled === "1",
          }),
        }),
      );
    });
  });

  app.post("/shop/checkout", async (request, reply) => {
    await withShop(request, reply, async ({ tenantId, locale, member }) => {
      assertSameOrigin(request);
      const cart = await currentCart(tenantId, request, reply, member?.id ?? null, locale);
      const body = request.body as Record<string, string>;
      try {
        const result = await createCheckout({
          tenant_id: tenantId,
          cart_id: cart.id,
          member_id: member?.id ?? null,
          locale,
          origin: requestOrigin(request),
          body: {
            email: body.email,
            shipping_rate_id: body.shipping_rate_id,
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
        sendHtml(
          reply,
          err instanceof AppError ? err.status : 400,
          renderShopHtml({
            locale,
            title: locale === "en" ? "Checkout" : "结账",
            siteName: request.hostTenantContext?.name ?? "",
            cartCount: cart.item_count,
            member,
            error: errorText(err, locale),
            body: checkoutHtml({
              locale,
              email: body.email ?? member?.email ?? "",
              rates: [],
            }),
          }),
        );
      }
    });
  });

  app.get("/shop/orders/:orderNumber", async (request, reply) => {
    await withShop(request, reply, async ({ tenantId, siteName, locale, member }) => {
      const { orderNumber } = request.params as { orderNumber: string };
      const cart = await currentCart(tenantId, request, reply, member?.id ?? null, locale);
      try {
        const order = await getOrderByNumber({
          tenant_id: tenantId,
          number: orderNumber,
          guest_token: readCookie(request, GUEST_ORDER_COOKIE),
          member_id: member?.id ?? null,
        });
        sendHtml(
          reply,
          200,
          renderShopHtml({
            locale,
            title: order.number,
            siteName,
            cartCount: cart.item_count,
            member,
            body: orderHtml({
              locale,
              currency: order.currency,
              order: {
                number: order.number,
                status: order.status,
                email: order.email,
                total_cents: order.total_cents,
                subtotal_cents: order.subtotal_cents,
                shipping_cents: order.shipping_cents,
                tax_cents: order.tax_cents,
                pending: order.status === "pending_payment",
                shipments: order.shipments,
                lines: order.lines,
              },
            }),
          }),
        );
      } catch (err) {
        sendHtml(
          reply,
          404,
          renderShopHtml({
            locale,
            title: locale === "en" ? "Order" : "订单",
            siteName,
            cartCount: cart.item_count,
            member,
            error: errorText(err, locale),
            body: "",
          }),
        );
      }
    });
  });

  app.get("/member/orders", async (request, reply) => {
    await withShop(request, reply, async ({ tenantId, siteName, locale, member }) => {
      if (!member) {
        void reply.redirect(
          `/member/login?redirect=${encodeURIComponent("/member/orders")}`,
          303,
        );
        return;
      }
      const cart = await currentCart(tenantId, request, reply, member.id, locale);
      const orders = await listMemberOrders({
        tenant_id: tenantId,
        member_id: member.id,
      });
      sendHtml(
        reply,
        200,
        renderShopHtml({
          locale,
          title: locale === "en" ? "My orders" : "我的订单",
          siteName,
          cartCount: cart.item_count,
          member,
          body: memberOrdersHtml({
            locale,
            currencyFallback: "USD",
            orders: orders.map((order) => ({
              number: order.number,
              status: order.status,
              total: formatMoney(order.total_cents, order.currency, locale),
            })),
          }),
        }),
      );
    });
  });

  app.get("/shop/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    if (["cart", "checkout", "orders"].includes(slug)) return;
    await withShop(request, reply, async ({ tenantId, siteName, locale, member }) => {
      const cart = await currentCart(tenantId, request, reply, member?.id ?? null, locale);
      try {
        const product = await getPublishedProductBySlug(tenantId, slug);
        sendHtml(
          reply,
          200,
          renderShopHtml({
            locale,
            title: displayTitle(product.title, locale, product.slug),
            description: displayTitle(product.description, locale),
            siteName,
            cartCount: cart.item_count,
            member,
            body: productDetailHtml({
              locale,
              title: displayTitle(product.title, locale, product.slug),
              description: displayTitle(product.description, locale),
              variants: product.variants.map((variant) => ({
                id: variant.id,
                label:
                  displayTitle(variant.title, locale) ||
                  variant.sku,
                price: formatMoney(variant.price_cents, variant.currency, locale),
                stock: variant.stock_qty,
              })),
            }),
          }),
        );
      } catch (err) {
        sendHtml(
          reply,
          404,
          renderShopHtml({
            locale,
            title: locale === "en" ? "Not found" : "未找到",
            siteName,
            cartCount: cart.item_count,
            member,
            error: errorText(err, locale),
            body: "",
          }),
        );
      }
    });
  });
}
