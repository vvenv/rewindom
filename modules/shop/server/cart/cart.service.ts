import { randomUUID } from "node:crypto";

import {
  NotFoundError,
  ValidationError,
  prisma,
  withTenantScope,
} from "@rewindom/module-sdk/server";
import type { AppLocale } from "@rewindom/module-sdk";

import type { ShopCartView } from "../../shared/index.js";
import { displayTitle } from "../lib/format.js";
import {
  readOptionValues,
  readShopOptions,
  variantStorefrontLabel,
} from "../../shared/product-options.js";

const CART_COOKIE = "shop_cart";

export function cartCookieName(): string {
  return CART_COOKIE;
}

export async function loadCart(params: {
  tenant_id: string;
  cart_id?: string | null;
  member_id?: string | null;
  locale: AppLocale;
}): Promise<ShopCartView> {
  let cart =
    (params.member_id
      ? await prisma.shopCart.findFirst({
          where: withTenantScope(params.tenant_id, { member_id: params.member_id }),
          include: { items: { include: { variant: { include: { product: true } } } } },
        })
      : null) ??
    (params.cart_id
      ? await prisma.shopCart.findFirst({
          where: withTenantScope(params.tenant_id, { id: params.cart_id }),
          include: { items: { include: { variant: { include: { product: true } } } } },
        })
      : null);

  if (!cart) {
    cart = await prisma.shopCart.create({
      data: {
        tenant_id: params.tenant_id,
        member_id: params.member_id ?? null,
        guest_token: params.member_id ? null : randomUUID(),
      },
      include: { items: { include: { variant: { include: { product: true } } } } },
    });
  } else if (params.member_id && cart.member_id !== params.member_id) {
    await prisma.shopCart.update({
      where: withTenantScope(params.tenant_id, { id: cart.id }),
      data: { member_id: params.member_id, guest_token: null },
    });
  }

  return toCartView(cart, params.locale);
}

export async function mergeGuestCartIntoMember(params: {
  tenant_id: string;
  guest_cart_id: string;
  member_id: string;
  locale: AppLocale;
}): Promise<ShopCartView> {
  const guest = await prisma.shopCart.findFirst({
    where: withTenantScope(params.tenant_id, { id: params.guest_cart_id }),
    include: { items: true },
  });
  const member = await prisma.shopCart.findFirst({
    where: withTenantScope(params.tenant_id, { member_id: params.member_id }),
    include: { items: true },
  });
  if (!guest) {
    return loadCart({
      tenant_id: params.tenant_id,
      member_id: params.member_id,
      locale: params.locale,
    });
  }
  if (!member || member.id === guest.id) {
    await prisma.shopCart.update({
      where: withTenantScope(params.tenant_id, { id: guest.id }),
      data: { member_id: params.member_id, guest_token: null },
    });
    return loadCart({
      tenant_id: params.tenant_id,
      cart_id: guest.id,
      member_id: params.member_id,
      locale: params.locale,
    });
  }
  await prisma.$transaction(async (tx) => {
    for (const item of guest.items) {
      const existing = member.items.find(
        (row) => row.variant_id === item.variant_id,
      );
      if (existing) {
        await tx.shopCartItem.update({
          where: withTenantScope(params.tenant_id, { id: existing.id }),
          data: { quantity: existing.quantity + item.quantity },
        });
      } else {
        await tx.shopCartItem.create({
          data: {
            tenant_id: params.tenant_id,
            cart_id: member.id,
            variant_id: item.variant_id,
            quantity: item.quantity,
          },
        });
      }
    }
    await tx.shopCart.delete({
      where: withTenantScope(params.tenant_id, { id: guest.id }),
    });
  });
  return loadCart({
    tenant_id: params.tenant_id,
    member_id: params.member_id,
    locale: params.locale,
  });
}

export async function addToCart(params: {
  tenant_id: string;
  cart_id: string;
  variant_id: string;
  quantity: number;
  locale: AppLocale;
}): Promise<ShopCartView> {
  const quantity = Math.max(1, Math.trunc(params.quantity));
  const variant = await prisma.shopVariant.findFirst({
    where: withTenantScope(params.tenant_id, { id: params.variant_id }),
    include: { product: true },
  });
  if (!variant || variant.product.status !== "published") {
    throw new NotFoundError("shop.product_not_found");
  }
  const cart = await prisma.shopCart.findFirst({
    where: withTenantScope(params.tenant_id, { id: params.cart_id }),
  });
  if (!cart) throw new NotFoundError("shop.cart_not_found");

  const existing = await prisma.shopCartItem.findFirst({
    where: withTenantScope(params.tenant_id, {
      cart_id: params.cart_id,
      variant_id: params.variant_id,
    }),
  });
  const nextQty = (existing?.quantity ?? 0) + quantity;
  if (nextQty > variant.stock_qty) {
    throw new ValidationError("shop.out_of_stock");
  }
  if (existing) {
    await prisma.shopCartItem.update({
      where: withTenantScope(params.tenant_id, { id: existing.id }),
      data: { quantity: nextQty },
    });
  } else {
    await prisma.shopCartItem.create({
      data: {
        tenant_id: params.tenant_id,
        cart_id: params.cart_id,
        variant_id: params.variant_id,
        quantity,
      },
    });
  }
  return loadCart({
    tenant_id: params.tenant_id,
    cart_id: params.cart_id,
    locale: params.locale,
  });
}

export async function updateCartItem(params: {
  tenant_id: string;
  cart_id: string;
  item_id: string;
  quantity: number;
  locale: AppLocale;
}): Promise<ShopCartView> {
  const item = await prisma.shopCartItem.findFirst({
    where: withTenantScope(params.tenant_id, {
      id: params.item_id,
      cart_id: params.cart_id,
    }),
    include: { variant: true },
  });
  if (!item) throw new NotFoundError("shop.cart_item_not_found");
  const quantity = Math.trunc(params.quantity);
  if (quantity <= 0) {
    await prisma.shopCartItem.delete({
      where: withTenantScope(params.tenant_id, { id: item.id }),
    });
  } else {
    if (quantity > item.variant.stock_qty) {
      throw new ValidationError("shop.out_of_stock");
    }
    await prisma.shopCartItem.update({
      where: withTenantScope(params.tenant_id, { id: item.id }),
      data: { quantity },
    });
  }
  return loadCart({
    tenant_id: params.tenant_id,
    cart_id: params.cart_id,
    locale: params.locale,
  });
}

function toCartView(
  cart: {
    id: string;
    currency: string;
    items: Array<{
      id: string;
      quantity: number;
      variant: {
        id: string;
        sku: string;
        price_cents: number;
        currency: string;
        stock_qty: number;
        title: unknown;
        option_values: unknown;
        product: { id: string; slug: string; title: unknown; options: unknown };
      };
    }>;
  },
  locale: AppLocale,
): ShopCartView {
  const items = cart.items.map((item) => {
    const title =
      variantStorefrontLabel(
        readShopOptions(item.variant.product.options),
        {
          sku: item.variant.sku,
          title:
            item.variant.title &&
            typeof item.variant.title === "object" &&
            !Array.isArray(item.variant.title)
              ? (item.variant.title as Record<string, string>)
              : null,
          option_values: readOptionValues(item.variant.option_values),
        },
        locale,
      ) || displayTitle(item.variant.product.title, locale, item.variant.sku);
    return {
      id: item.id,
      variant_id: item.variant.id,
      product_id: item.variant.product.id,
      product_slug: item.variant.product.slug,
      title,
      sku: item.variant.sku,
      quantity: item.quantity,
      unit_price_cents: item.variant.price_cents,
      currency: item.variant.currency,
      stock_qty: item.variant.stock_qty,
      line_total_cents: item.variant.price_cents * item.quantity,
    };
  });
  return {
    id: cart.id,
    currency: items[0]?.currency ?? cart.currency,
    item_count: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal_cents: items.reduce((sum, item) => sum + item.line_total_cents, 0),
    items,
  };
}
