import { randomUUID } from "node:crypto";

import {
  NotFoundError,
  ValidationError,
  prisma,
  withTenantScope,
} from "@rewindom/module-sdk/server";
import type { AppLocale } from "@rewindom/module-sdk";

import type { ShopCartView } from "../../shared/index.js";
import {
  featuredImage,
  isVariantAvailable,
  quoteDiscount,
  readInventoryPolicy,
  readShopImages,
  normalizeDiscountCode,
} from "../../shared/index.js";
import { displayTitle } from "../lib/format.js";
import { findDiscountByCode } from "../discount/discount.service.js";
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

  return cartToView(params.tenant_id, cart, params.locale);
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
    if (!member.discount_code && guest.discount_code) {
      await tx.shopCart.update({
        where: withTenantScope(params.tenant_id, { id: member.id }),
        data: { discount_code: guest.discount_code },
      });
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
  if (
    !isVariantAvailable(
      {
        stock_qty: variant.stock_qty,
        track_inventory: variant.track_inventory,
        inventory_policy: readInventoryPolicy(variant.inventory_policy),
      },
      nextQty,
    )
  ) {
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
    if (
      quantity >
      0 &&
      !isVariantAvailable(
        {
          stock_qty: item.variant.stock_qty,
          track_inventory: item.variant.track_inventory,
          inventory_policy: readInventoryPolicy(item.variant.inventory_policy),
        },
        quantity,
      )
    ) {
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
    discount_code: string | null;
    items: Array<{
      id: string;
      quantity: number;
      variant: {
        id: string;
        sku: string;
        price_cents: number;
        currency: string;
        stock_qty: number;
        track_inventory: boolean;
        inventory_policy: string;
        requires_shipping: boolean;
        taxable: boolean;
        title: unknown;
        option_values: unknown;
        product: {
          id: string;
          slug: string;
          title: unknown;
          options: unknown;
          images: unknown;
        };
      };
    }>;
  },
  locale: AppLocale,
  discount_cents: number,
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
      image_url:
        featuredImage(readShopImages(item.variant.product.images))?.url ?? null,
      quantity: item.quantity,
      unit_price_cents: item.variant.price_cents,
      currency: item.variant.currency,
      stock_qty: item.variant.stock_qty,
      track_inventory: item.variant.track_inventory,
      inventory_policy: readInventoryPolicy(item.variant.inventory_policy),
      requires_shipping: item.variant.requires_shipping,
      taxable: item.variant.taxable,
      line_total_cents: item.variant.price_cents * item.quantity,
    };
  });
  const subtotal_cents = items.reduce((sum, item) => sum + item.line_total_cents, 0);
  return {
    id: cart.id,
    currency: items[0]?.currency ?? cart.currency,
    item_count: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal_cents,
    discount_code: cart.discount_code,
    discount_cents: Math.min(Math.max(0, discount_cents), subtotal_cents),
    items,
  };
}

async function quoteCartDiscount(
  tenant_id: string,
  code: string | null,
  subtotal_cents: number,
): Promise<number> {
  if (!code) return 0;
  const discount = await findDiscountByCode(tenant_id, code);
  if (!discount) return 0;
  const quote = quoteDiscount(discount, subtotal_cents);
  return quote.ok ? quote.discount_cents : 0;
}

async function cartToView(
  tenant_id: string,
  cart: Parameters<typeof toCartView>[0],
  locale: AppLocale,
): Promise<ShopCartView> {
  const draft = toCartView(cart, locale, 0);
  const discount_cents = await quoteCartDiscount(
    tenant_id,
    cart.discount_code,
    draft.subtotal_cents,
  );
  return { ...draft, discount_cents };
}

export async function applyCartDiscount(params: {
  tenant_id: string;
  cart_id: string;
  code: string;
  locale: AppLocale;
}): Promise<ShopCartView> {
  const cart = await prisma.shopCart.findFirst({
    where: withTenantScope(params.tenant_id, { id: params.cart_id }),
  });
  if (!cart) throw new NotFoundError("shop.cart_not_found");
  const trimmed = params.code.trim();
  if (!trimmed) {
    await prisma.shopCart.update({
      where: withTenantScope(params.tenant_id, { id: cart.id }),
      data: { discount_code: null },
    });
    return loadCart({
      tenant_id: params.tenant_id,
      cart_id: cart.id,
      locale: params.locale,
    });
  }
  const normalized = normalizeDiscountCode(trimmed);
  if (!normalized) throw new ValidationError("shop.discount_invalid");
  const current = await loadCart({
    tenant_id: params.tenant_id,
    cart_id: cart.id,
    locale: params.locale,
  });
  const discount = await findDiscountByCode(params.tenant_id, normalized);
  if (!discount) throw new ValidationError("shop.discount_invalid");
  const quote = quoteDiscount(discount, current.subtotal_cents);
  if (!quote.ok) throw new ValidationError("shop.discount_invalid");
  await prisma.shopCart.update({
    where: withTenantScope(params.tenant_id, { id: cart.id }),
    data: { discount_code: normalized },
  });
  return loadCart({
    tenant_id: params.tenant_id,
    cart_id: cart.id,
    locale: params.locale,
  });
}
