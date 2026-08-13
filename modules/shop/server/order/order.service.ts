import { randomBytes } from "node:crypto";

import {
  ConflictError,
  NotFoundError,
  ValidationError,
  prisma,
  resolveSortField,
  resolveSortOrder,
  withTenantScope,
} from "@rewindom/module-sdk/server";
import type { AppLocale } from "@rewindom/module-sdk";
import Stripe from "stripe";

import type {
  FulfillShopOrderBody,
  ShopAddress,
  ShopCheckoutBody,
  ShopOrderDetail,
  ShopOrderListItem,
  ShopOrderStatus,
  TaxProvider,
} from "../../shared/index.js";
import {
  cartHasTaxableItem,
  cartRequiresShipping,
  isShopOrderRefundable,
  isShopOrderStatus,
  isVariantAvailable,
  quoteDiscount,
  readInventoryPolicy,
  readOrderNote,
} from "../../shared/index.js";
import { loadCart } from "../cart/cart.service.js";
import { findDiscountByCode } from "../discount/discount.service.js";
import {
  displayTitle,
  normalizeCountry,
  normalizeCurrency,
} from "../lib/format.js";
import { getShopSetting, resolveShopStripeCredentials } from "../payment/credentials.js";
import { assertRateServesCountry } from "../shipping/shipping.service.js";
import { StripeCheckoutTaxProvider, ZeroTaxProvider } from "../tax/tax.provider.js";

const ORDER_SORTABLE = new Set(["number", "status", "created_at", "total_cents"]);

function parseAddress(raw: unknown): ShopAddress {
  const value = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const line1 = typeof value.line1 === "string" ? value.line1.trim() : "";
  const city = typeof value.city === "string" ? value.city.trim() : "";
  const postal = typeof value.postal_code === "string" ? value.postal_code.trim() : "";
  const country = normalizeCountry(value.country);
  if (!name || !line1 || !city || !postal || !country) {
    throw new ValidationError("shop.address_invalid");
  }
  return {
    name,
    line1,
    line2: typeof value.line2 === "string" ? value.line2.trim() : undefined,
    city,
    state: typeof value.state === "string" ? value.state.trim() : undefined,
    postal_code: postal,
    country,
    phone: typeof value.phone === "string" ? value.phone.trim() : undefined,
  };
}

function parseEmail(value: unknown): string {
  if (typeof value !== "string") throw new ValidationError("shop.email_invalid");
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    throw new ValidationError("shop.email_invalid");
  }
  return email;
}

function newOrderNumber(): string {
  const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const rand = randomBytes(3).toString("hex").toUpperCase();
  return `S${stamp}${rand}`;
}

function newGuestToken(): string {
  return randomBytes(24).toString("hex");
}

function toOrderListItem(record: {
  id: string;
  number: string;
  status: string;
  email: string;
  total_cents: number;
  currency: string;
  created_at: Date;
  paid_at: Date | null;
}): ShopOrderListItem {
  return {
    id: record.id,
    number: record.number,
    status: isShopOrderStatus(record.status) ? record.status : "pending_payment",
    email: record.email,
    total_cents: record.total_cents,
    currency: record.currency,
    created_at: record.created_at.toISOString(),
    paid_at: record.paid_at?.toISOString() ?? null,
  };
}

function toOrderDetail(record: {
  id: string;
  number: string;
  status: string;
  email: string;
  member_id: string | null;
  total_cents: number;
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  discount_code: string | null;
  discount_cents: number;
  note: string | null;
  currency: string;
  created_at: Date;
  paid_at: Date | null;
  shipping_address: unknown;
  shipping_rate_name: string | null;
  carrier_code: string | null;
  lines: Array<{
    id: string;
    sku: string;
    title: string;
    quantity: number;
    unit_price_cents: number;
    hs_code: string | null;
    origin_country: string | null;
  }>;
  shipments: Array<{
    id: string;
    carrier_code: string;
    tracking_number: string;
    shipped_at: Date;
    customs_snapshot: unknown;
  }>;
  payments: Array<{
    id: string;
    provider: string;
    provider_ref: string;
    amount_cents: number;
    currency: string;
    status: string;
    paid_at: Date | null;
  }>;
}): ShopOrderDetail {
  return {
    ...toOrderListItem(record),
    member_id: record.member_id,
    subtotal_cents: record.subtotal_cents,
    shipping_cents: record.shipping_cents,
    tax_cents: record.tax_cents,
    discount_code: record.discount_code,
    discount_cents: record.discount_cents,
    note: record.note,
    shipping_address: parseAddress(record.shipping_address),
    shipping_rate_name: record.shipping_rate_name,
    carrier_code: record.carrier_code,
    lines: record.lines.map((line) => ({
      id: line.id,
      sku: line.sku,
      title: line.title,
      quantity: line.quantity,
      unit_price_cents: line.unit_price_cents,
      hs_code: line.hs_code,
      origin_country: line.origin_country,
    })),
    shipments: record.shipments.map((shipment) => ({
      id: shipment.id,
      carrier_code: shipment.carrier_code,
      tracking_number: shipment.tracking_number,
      shipped_at: shipment.shipped_at.toISOString(),
      customs_snapshot:
        shipment.customs_snapshot &&
        typeof shipment.customs_snapshot === "object" &&
        !Array.isArray(shipment.customs_snapshot)
          ? (shipment.customs_snapshot as Record<string, unknown>)
          : null,
    })),
    payments: record.payments.map((payment) => ({
      id: payment.id,
      provider: payment.provider,
      provider_ref: payment.provider_ref,
      amount_cents: payment.amount_cents,
      currency: payment.currency,
      status: payment.status,
      paid_at: payment.paid_at?.toISOString() ?? null,
    })),
  };
}

const orderInclude = {
  lines: true,
  shipments: { orderBy: { shipped_at: "desc" as const } },
  payments: { orderBy: { created_at: "desc" as const } },
};

export async function listOrders(params: {
  tenant_id: string;
  page: number;
  page_size: number;
  q?: string;
  status?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}): Promise<{
  items: ShopOrderListItem[];
  page: number;
  page_size: number;
  total: number;
  page_count: number;
}> {
  const skip = (params.page - 1) * params.page_size;
  const field = resolveSortField(params.sort_by, ORDER_SORTABLE, "created_at");
  const order = resolveSortOrder(params.sort_dir, "desc");
  const where = withTenantScope(params.tenant_id, {
    ...(params.status && isShopOrderStatus(params.status)
      ? { status: params.status }
      : {}),
    ...(params.q?.trim()
      ? {
          OR: [
            { number: { contains: params.q.trim(), mode: "insensitive" as const } },
            { email: { contains: params.q.trim(), mode: "insensitive" as const } },
          ],
        }
      : {}),
  });
  const [records, total] = await Promise.all([
    prisma.shopOrder.findMany({
      where,
      orderBy: { [field]: order },
      skip,
      take: params.page_size,
    }),
    prisma.shopOrder.count({ where }),
  ]);
  return {
    items: records.map(toOrderListItem),
    page: params.page,
    page_size: params.page_size,
    total,
    page_count: Math.ceil(total / params.page_size),
  };
}

export async function getOrder(
  tenant_id: string,
  order_id: string,
): Promise<ShopOrderDetail> {
  const record = await prisma.shopOrder.findFirst({
    where: withTenantScope(tenant_id, { id: order_id }),
    include: orderInclude,
  });
  if (!record) throw new NotFoundError("shop.order_not_found");
  return toOrderDetail(record);
}

export async function getOrderByNumber(params: {
  tenant_id: string;
  number: string;
  guest_token?: string | null;
  member_id?: string | null;
}): Promise<ShopOrderDetail> {
  const record = await prisma.shopOrder.findFirst({
    where: withTenantScope(params.tenant_id, { number: params.number }),
    include: orderInclude,
  });
  if (!record) throw new NotFoundError("shop.order_not_found");
  const allowed =
    (params.member_id && record.member_id === params.member_id) ||
    (params.guest_token && record.guest_token === params.guest_token);
  if (!allowed) throw new NotFoundError("shop.order_not_found");
  return toOrderDetail(record);
}

export async function listMemberOrders(params: {
  tenant_id: string;
  member_id: string;
}): Promise<ShopOrderListItem[]> {
  const records = await prisma.shopOrder.findMany({
    where: withTenantScope(params.tenant_id, { member_id: params.member_id }),
    orderBy: { created_at: "desc" },
    take: 50,
  });
  return records.map(toOrderListItem);
}

export async function createCheckout(params: {
  tenant_id: string;
  cart_id: string;
  member_id?: string | null;
  body: ShopCheckoutBody;
  locale: AppLocale;
  origin: string;
  tax?: TaxProvider;
}): Promise<{ checkout_url: string; order_number: string; guest_token: string }> {
  const email = parseEmail(params.body.email);
  const note = readOrderNote(params.body.note);
  const cart = await loadCart({
    tenant_id: params.tenant_id,
    cart_id: params.cart_id,
    member_id: params.member_id,
    locale: params.locale,
  });
  if (cart.items.length === 0) {
    throw new ValidationError("shop.cart_empty");
  }
  for (const item of cart.items) {
    if (
      !isVariantAvailable(
        {
          stock_qty: item.stock_qty,
          track_inventory: item.track_inventory,
          inventory_policy: item.inventory_policy,
        },
        item.quantity,
      )
    ) {
      throw new ConflictError("shop.out_of_stock");
    }
  }
  const setting = await getShopSetting(params.tenant_id);
  const needsShipping = cartRequiresShipping(cart.items);
  const address = needsShipping
    ? parseAddress(params.body.shipping_address)
    : {
        name: email,
        line1: "—",
        city: "—",
        postal_code: "00000",
        country: setting.origin_country,
      };
  const rate = needsShipping
    ? await assertRateServesCountry(
        params.tenant_id,
        params.body.shipping_rate_id ?? "",
        address.country,
      )
    : null;
  const shipping_cents = rate?.price_cents ?? 0;
  let discount_code: string | null = cart.discount_code;
  let discount_cents = 0;
  if (discount_code) {
    const discount = await findDiscountByCode(params.tenant_id, discount_code);
    const quote = discount
      ? quoteDiscount(discount, cart.subtotal_cents)
      : { ok: false as const };
    if (!quote.ok) {
      await prisma.shopCart.update({
        where: withTenantScope(params.tenant_id, { id: cart.id }),
        data: { discount_code: null },
      });
      throw new ValidationError("shop.discount_invalid");
    }
    discount_cents = quote.discount_cents;
  }
  const discounted_subtotal = Math.max(0, cart.subtotal_cents - discount_cents);
  const taxable = cartHasTaxableItem(cart.items);
  const taxProvider =
    params.tax ??
    (setting.stripe_tax_enabled && taxable
      ? new StripeCheckoutTaxProvider()
      : new ZeroTaxProvider());
  const tax = await taxProvider.quote({
    destination_country: address.country,
    currency: cart.currency,
    subtotal_cents: discounted_subtotal,
    shipping_cents,
    lines: cart.items.map((item) => ({ amount_cents: item.line_total_cents })),
  });
  const total = discounted_subtotal + shipping_cents + Math.max(0, tax.tax_cents);
  const credentials = await resolveShopStripeCredentials(params.tenant_id);
  if (!credentials) {
    throw new ValidationError("shop.stripe_unconfigured");
  }

  const guest_token = newGuestToken();
  const number = newOrderNumber();
  const variants = await prisma.shopVariant.findMany({
    where: withTenantScope(params.tenant_id, {
      id: { in: cart.items.map((item) => item.variant_id) },
    }),
    include: { product: true },
  });
  const variantMap = new Map(variants.map((item) => [item.id, item]));

  const order = await prisma.shopOrder.create({
    data: {
      tenant_id: params.tenant_id,
      number,
      status: "pending_payment",
      email,
      member_id: params.member_id ?? null,
      guest_token,
      currency: normalizeCurrency(cart.currency, setting.currency),
      subtotal_cents: cart.subtotal_cents,
      shipping_cents,
      tax_cents: tax.tax_cents,
      discount_code,
      discount_cents,
      total_cents: total,
      note,
      shipping_address: { ...address },
      shipping_rate_id: rate?.id ?? null,
      shipping_rate_name: rate?.name ?? null,
      carrier_code: rate?.carrier_code ?? null,
      lines: {
        create: cart.items.map((item) => {
          const variant = variantMap.get(item.variant_id);
          return {
            tenant_id: params.tenant_id,
            variant_id: item.variant_id,
            sku: item.sku,
            title: item.title,
            quantity: item.quantity,
            unit_price_cents: item.unit_price_cents,
            weight_g: variant?.weight_g ?? 0,
            hs_code: variant?.hs_code ?? null,
            origin_country: variant?.origin_country ?? setting.origin_country,
          };
        }),
      },
    },
  });

  const stripe = new Stripe(credentials.secretKey);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    success_url: `${params.origin}/shop/orders/${encodeURIComponent(number)}?checkout=success`,
    cancel_url: `${params.origin}/shop/checkout?canceled=1`,
    client_reference_id: order.id,
    metadata: {
      tenant_id: params.tenant_id,
      order_id: order.id,
      order_number: number,
      cart_id: params.cart_id,
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: order.currency.toLowerCase(),
          unit_amount: order.total_cents,
          product_data: {
            name: displayTitle(
              { "zh-CN": `订单 ${number}`, en: `Order ${number}` },
              params.locale,
              number,
            ),
          },
        },
      },
    ],
    automatic_tax:
      setting.stripe_tax_enabled && taxable ? { enabled: true } : undefined,
  });
  if (!session.url) {
    throw new ValidationError("shop.stripe_checkout_url_missing");
  }
  await prisma.shopOrder.update({
    where: withTenantScope(params.tenant_id, { id: order.id }),
    data: { stripe_checkout_session_id: session.id },
  });
  return { checkout_url: session.url, order_number: number, guest_token };
}

export async function markOrderPaid(params: {
  tenant_id: string;
  order_id: string;
  provider_ref: string;
  amount_cents: number;
  tax_cents?: number;
  cart_id?: string;
  raw_event?: unknown;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.shopOrder.findFirst({
      where: withTenantScope(params.tenant_id, { id: params.order_id }),
      include: { lines: true, payments: true },
    });
    if (!order) throw new NotFoundError("shop.order_not_found");
    if (order.status !== "pending_payment") return;

    for (const line of order.lines) {
      if (!line.variant_id) continue;
      const variant = await tx.shopVariant.findFirst({
        where: withTenantScope(params.tenant_id, { id: line.variant_id }),
      });
      if (!variant || !variant.track_inventory) continue;
      if (readInventoryPolicy(variant.inventory_policy) === "continue") {
        await tx.shopVariant.update({
          where: withTenantScope(params.tenant_id, { id: variant.id }),
          data: { stock_qty: { decrement: line.quantity } },
        });
        continue;
      }
      const updated = await tx.shopVariant.updateMany({
        where: withTenantScope(params.tenant_id, {
          id: line.variant_id,
          stock_qty: { gte: line.quantity },
        }),
        data: { stock_qty: { decrement: line.quantity } },
      });
      if (updated.count !== 1) {
        throw new ConflictError("shop.out_of_stock");
      }
    }

    await tx.shopPayment.create({
      data: {
        tenant_id: params.tenant_id,
        order_id: order.id,
        provider: "stripe",
        provider_ref: params.provider_ref,
        amount_cents: params.amount_cents,
        currency: order.currency,
        status: "paid",
        paid_at: new Date(),
        raw_event: params.raw_event as object | undefined,
      },
    });
    await tx.shopOrder.update({
      where: withTenantScope(params.tenant_id, { id: order.id }),
      data: {
        status: "paid",
        paid_at: new Date(),
        ...(params.tax_cents !== undefined ? { tax_cents: params.tax_cents } : {}),
      },
    });
    await tx.shopCartItem.deleteMany({
      where: withTenantScope(
        params.tenant_id,
        params.cart_id
          ? { cart_id: params.cart_id }
          : {
              variant_id: {
                in: order.lines
                  .map((line) => line.variant_id)
                  .filter((id): id is string => Boolean(id)),
              },
            },
      ),
    });
    if (order.discount_code) {
      const discount = await tx.shopDiscount.findFirst({
        where: withTenantScope(params.tenant_id, { code: order.discount_code }),
      });
      if (discount) {
        await tx.shopDiscount.updateMany({
          where: withTenantScope(
            params.tenant_id,
            discount.max_uses == null
              ? { id: discount.id }
              : { id: discount.id, used_count: { lt: discount.max_uses } },
          ),
          data: { used_count: { increment: 1 } },
        });
      }
    }
  });
}

export async function cancelUnpaidOrder(
  tenant_id: string,
  order_id: string,
): Promise<void> {
  const order = await prisma.shopOrder.findFirst({
    where: withTenantScope(tenant_id, { id: order_id }),
  });
  if (!order || order.status !== "pending_payment") return;
  await prisma.shopOrder.update({
    where: withTenantScope(tenant_id, { id: order_id }),
    data: { status: "cancelled" },
  });
}

export async function fulfillOrder(params: {
  tenant_id: string;
  order_id: string;
  body: FulfillShopOrderBody;
}): Promise<ShopOrderDetail> {
  const order = await prisma.shopOrder.findFirst({
    where: withTenantScope(params.tenant_id, { id: params.order_id }),
    include: { lines: true },
  });
  if (!order) throw new NotFoundError("shop.order_not_found");
  const status = order.status as ShopOrderStatus;
  if (status !== "paid" && status !== "fulfilling") {
    throw new ValidationError("shop.order_not_fulfillable");
  }
  const carrier = params.body.carrier_code.trim();
  const tracking = params.body.tracking_number.trim();
  if (!carrier || !tracking) {
    throw new ValidationError("shop.tracking_required");
  }
  const setting = await getShopSetting(params.tenant_id);
  const customs_snapshot = {
    ioss_number: setting.ioss_number,
    eori_number: setting.eori_number,
    origin_country: setting.origin_country,
    lines: order.lines.map((line) => ({
      sku: line.sku,
      title: line.title,
      quantity: line.quantity,
      unit_price_cents: line.unit_price_cents,
      hs_code: line.hs_code,
      origin_country: line.origin_country ?? setting.origin_country,
      weight_g: line.weight_g,
    })),
  };
  await prisma.shopShipment.create({
    data: {
      tenant_id: params.tenant_id,
      order_id: order.id,
      carrier_code: carrier,
      tracking_number: tracking,
      customs_snapshot,
    },
  });
  await prisma.shopOrder.update({
    where: withTenantScope(params.tenant_id, { id: order.id }),
    data: { status: "shipped", carrier_code: carrier },
  });
  return getOrder(params.tenant_id, order.id);
}

export async function completeOrder(
  tenant_id: string,
  order_id: string,
): Promise<ShopOrderDetail> {
  const order = await prisma.shopOrder.findFirst({
    where: withTenantScope(tenant_id, { id: order_id }),
  });
  if (!order) throw new NotFoundError("shop.order_not_found");
  if (order.status !== "shipped") {
    throw new ValidationError("shop.order_not_completable");
  }
  await prisma.shopOrder.update({
    where: withTenantScope(tenant_id, { id: order_id }),
    data: { status: "completed" },
  });
  return getOrder(tenant_id, order_id);
}

export async function refundOrder(params: {
  tenant_id: string;
  order_id: string;
  restock?: boolean;
}): Promise<ShopOrderDetail> {
  const order = await prisma.shopOrder.findFirst({
    where: withTenantScope(params.tenant_id, { id: params.order_id }),
    include: { lines: true, payments: true },
  });
  if (!order) throw new NotFoundError("shop.order_not_found");
  if (!isShopOrderRefundable(order.status)) {
    throw new ValidationError("shop.order_not_refundable");
  }
  if (!order.stripe_checkout_session_id) {
    throw new ValidationError("shop.order_not_refundable");
  }
  const credentials = await resolveShopStripeCredentials(params.tenant_id);
  if (!credentials) {
    throw new ValidationError("shop.stripe_unconfigured");
  }
  const stripe = new Stripe(credentials.secretKey);
  const session = await stripe.checkout.sessions.retrieve(
    order.stripe_checkout_session_id,
  );
  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  if (!paymentIntent) {
    throw new ValidationError("shop.order_not_refundable");
  }
  try {
    await stripe.refunds.create({ payment_intent: paymentIntent });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (!/already been refunded|has already been refunded/iu.test(message)) {
      throw new ValidationError("shop.stripe_refund_failed");
    }
  }

  const restock = params.restock !== false;
  await prisma.$transaction(async (tx) => {
    if (restock) {
      for (const line of order.lines) {
        if (!line.variant_id) continue;
        const variant = await tx.shopVariant.findFirst({
          where: withTenantScope(params.tenant_id, { id: line.variant_id }),
        });
        if (!variant || !variant.track_inventory) continue;
        await tx.shopVariant.update({
          where: withTenantScope(params.tenant_id, { id: variant.id }),
          data: { stock_qty: { increment: line.quantity } },
        });
      }
    }
    await tx.shopPayment.updateMany({
      where: withTenantScope(params.tenant_id, {
        order_id: order.id,
        status: "paid",
      }),
      data: { status: "refunded" },
    });
    await tx.shopOrder.update({
      where: withTenantScope(params.tenant_id, { id: order.id }),
      data: { status: "refunded" },
    });
  });
  return getOrder(params.tenant_id, order.id);
}

export function peekStripeTenantId(event: Stripe.Event): string | null {
  const object = event.data.object as { metadata?: Record<string, string> };
  const tenantId = object.metadata?.tenant_id?.trim();
  return tenantId || null;
}
