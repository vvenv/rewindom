/**
 * 带 locale 前缀的店面 GET：`/en/shop`、`/en/shop/mug`。
 *
 * 无前缀的 `/shop` 仍走本模块自己的 Fastify 路由（要写购物车 cookie）。
 * marketing SSR 在剥掉 locale 之后问这张表，所以 `/en/shop` 与 `/shop` 同一套渲染。
 */

import { NotFoundError } from "@rewindom/module-sdk/server";
import { normalizeLocale } from "@rewindom/module-sdk";
import { registerSitePathHandler } from "@rewindom/builtin/marketing/shared/site-path-handlers.js";
import type { SitePathHandlerInput } from "@rewindom/builtin/marketing/shared/site-path-handlers.js";

import { SHOP_ENTITLEMENT } from "../../shared/entitlements.js";
import {
  SHOP_INDEX_PAGE_KIND,
  SHOP_INDEX_TEMPLATE_PRESET,
  SHOP_PRODUCT_TEMPLATE_PRESET,
} from "../../shared/shop-page-templates.js";
import { SHOP_PRODUCT_PAGE_KIND } from "../../shared/product-section.js";
import {
  SHOP_INDEX_PATH,
  isShopLocaleSwitchablePath,
} from "../../shared/shop-section-context.js";
import { cartCookieName, peekCart } from "../cart/cart.service.js";
import {
  getPublishedProductBySlug,
  listPublishedProducts,
} from "../catalog/catalog.service.js";
import { renderShopTemplatePage } from "./shop-page.js";
import {
  buildShopContext,
  toCartView,
  toProductCard,
  toProductDetail,
} from "./shop-view.js";

function productSlugFromPath(path: string): string | null {
  if (path === SHOP_INDEX_PATH) return null;
  return decodeURIComponent(path.slice(SHOP_INDEX_PATH.length + 1));
}

async function renderShopPath(
  input: SitePathHandlerInput,
): Promise<string | null> {
  if (!isShopLocaleSwitchablePath(input.path)) return null;

  const locale = normalizeLocale(input.locale);
  const cart = await peekCart({
    tenant_id: input.tenantId,
    cart_id: input.cookies?.get(cartCookieName()) ?? null,
    locale,
  });
  const cartView = cart ? toCartView(cart, locale) : null;
  const slug = productSlugFromPath(input.path);

  if (slug === null) {
    const products = await listPublishedProducts(input.tenantId);
    return renderShopTemplatePage({
      tenantId: input.tenantId,
      tenantSlug: input.tenantSlug,
      siteName: input.tenantSlug,
      origin: input.origin,
      locale,
      kind: SHOP_INDEX_PAGE_KIND,
      path: SHOP_INDEX_PATH,
      servedPath: input.servedPath,
      preset: SHOP_INDEX_TEMPLATE_PRESET,
      shop: buildShopContext({
        products: products.map((product) => toProductCard(product, locale)),
        cart: cartView,
      }),
    });
  }

  try {
    const product = await getPublishedProductBySlug(input.tenantId, slug);
    return renderShopTemplatePage({
      tenantId: input.tenantId,
      tenantSlug: input.tenantSlug,
      siteName: input.tenantSlug,
      origin: input.origin,
      locale,
      kind: SHOP_PRODUCT_PAGE_KIND,
      path: `${SHOP_INDEX_PATH}/${encodeURIComponent(slug)}`,
      servedPath: input.servedPath,
      preset: SHOP_PRODUCT_TEMPLATE_PRESET,
      shop: buildShopContext({
        cart: cartView,
        product: toProductDetail(product, locale),
      }),
    });
  } catch (error) {
    if (error instanceof NotFoundError) return null;
    throw error;
  }
}

export function registerShopPathHandler(): void {
  registerSitePathHandler({
    match: isShopLocaleSwitchablePath,
    entitlement: SHOP_ENTITLEMENT.key,
    render: renderShopPath,
  });
}
