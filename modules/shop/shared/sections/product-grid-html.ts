import { filterProductsByCollectionSlug } from "../collection.js";
import { readShopContext } from "../shop-section-context.js";
import { shopMediaSlotHtml, shopPriceHtml } from "./html-helpers.js";

import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";
import {
  settingBool,
  settingNumber,
  settingText,
  type SettingValues,
} from "@rewindom/builtin/marketing/shared/section-schema.js";
import {
  gridClass,
  sectionHeading,
} from "@rewindom/builtin/marketing/shared/sections/_common/html.js";
import { siteHref } from "@rewindom/builtin/marketing/shared/site-locale.js";
import type { SectionHtmlRenderer } from "@rewindom/builtin/marketing/shared/sections/render-context.js";

import type { ShopProductCardView } from "../shop-section-context.js";

function priceCell(product: ShopProductCardView, showPrice: boolean): string {
  if (!showPrice || !product.price) return "";
  return shopPriceHtml(product.price, product.compare_at_price);
}

/**
 * 商品网格的 markup：`shop.product-grid` 与 `shop.collection-products` 共用。
 *
 * 两段只在「条目从哪儿来」上分家（手填分类 vs 当前地址上的分类），画出来的必须
 * 是同一种卡片 / 列表——否则同一批商品在目录页和分类页上长得不一样。
 */
export function productGridBodyHtml(
  products: readonly ShopProductCardView[],
  s: SettingValues,
  ctx: Parameters<SectionHtmlRenderer>[1],
): string {
  const limit = settingNumber(s, "limit", 0);
  const items = limit > 0 ? products.slice(0, limit) : products;
  const heading = sectionHeading(s);
  if (items.length === 0) {
    const empty = settingText(s, "empty_text");
    return `${heading}${empty ? `<p class="shop-muted">${escapeHtml(empty)}</p>` : ""}`;
  }
  const showPrice = settingBool(s, "show_price");
  if (settingText(s, "style") === "list") {
    const rows = items
      .map(
        (product) =>
          `<a href="${escapeHtml(siteHref(product.href, ctx))}">${shopMediaSlotHtml(product.image_url, product.image_alt, "shop-grid-row-media")}<span class="shop-grid-row-title">${escapeHtml(product.title)}</span>${priceCell(product, showPrice)}</a>`,
      )
      .join("");
    return `${heading}<div class="shop-grid-list">${rows}</div>`;
  }
  const cards = items
    .map(
      (product) =>
        `<a class="card shop-card" href="${escapeHtml(siteHref(product.href, ctx))}">${shopMediaSlotHtml(product.image_url, product.image_alt, "shop-card-media")}<span class="shop-card-body"><span class="title">${escapeHtml(product.title)}</span>${priceCell(product, showPrice)}</span></a>`,
    )
    .join("");
  return `${heading}<div class="${gridClass(settingNumber(s, "columns", 3))} shop-grid">${cards}</div>`;
}

export const renderProductGridHtml: SectionHtmlRenderer = (section, ctx) => {
  const shop = readShopContext(ctx);
  if (!shop) return "";
  const s = section.settings;
  const collectionSlug =
    settingText(s, "collection_slug").trim() || shop.collection_slug || "";
  return productGridBodyHtml(
    filterProductsByCollectionSlug(shop.products, collectionSlug),
    s,
    ctx,
  );
};
