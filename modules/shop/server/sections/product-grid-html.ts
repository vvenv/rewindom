import { productGridSection } from "../../shared/product-grid-section.js";
import { filterProductsByCollectionSlug } from "../../shared/collection.js";
import { readShopContext } from "../../shared/shop-section-context.js";
import { SHOP_STOREFRONT_CSS } from "../../shared/site-css.generated.js";
import { shopMediaSlotHtml, shopPriceHtml } from "./html-helpers.js";

import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";
import {
  settingBool,
  settingNumber,
  settingText,
} from "@rewindom/builtin/marketing/shared/section-schema.js";
import {
  gridClass,
  sectionHeading,
} from "@rewindom/builtin/marketing/shared/sections/_common/html.js";
import {
  registerSiteSectionHtml,
  type SectionHtmlRenderer,
} from "@rewindom/builtin/marketing/shared/sections/html.js";

import type { ShopProductCardView } from "../../shared/shop-section-context.js";

function priceCell(product: ShopProductCardView, showPrice: boolean): string {
  if (!showPrice || !product.price) return "";
  return shopPriceHtml(product.price, product.compare_at_price);
}

const renderProductGridHtml: SectionHtmlRenderer = (section, ctx) => {
  const shop = readShopContext(ctx);
  if (!shop) return "";
  const s = section.settings;
  const limit = settingNumber(s, "limit", 0);
  const collectionSlug =
    settingText(s, "collection_slug").trim() || shop.collection_slug || "";
  const filtered = filterProductsByCollectionSlug(shop.products, collectionSlug);
  const items = limit > 0 ? filtered.slice(0, limit) : filtered;
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
          `<a href="${escapeHtml(product.href)}">${shopMediaSlotHtml(product.image_url, product.image_alt, "shop-grid-row-media")}<span class="shop-grid-row-title">${escapeHtml(product.title)}</span>${priceCell(product, showPrice)}</a>`,
      )
      .join("");
    return `${heading}<div class="shop-grid-list">${rows}</div>`;
  }
  const cards = items
    .map(
      (product) =>
        `<a class="card shop-card" href="${escapeHtml(product.href)}">${shopMediaSlotHtml(product.image_url, product.image_alt, "shop-card-media")}<span class="shop-card-body"><span class="title">${escapeHtml(product.title)}</span>${priceCell(product, showPrice)}</span></a>`,
    )
    .join("");
  return `${heading}<div class="${gridClass(settingNumber(s, "columns", 3))} shop-grid">${cards}</div>`;
};

export function registerProductGridSection(): void {
  registerSiteSectionHtml(productGridSection, renderProductGridHtml, {
    css: SHOP_STOREFRONT_CSS,
  });
}
