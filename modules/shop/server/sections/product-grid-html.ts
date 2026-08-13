import { productGridSection } from "../../shared/product-grid-section.js";
import { filterProductsByCollectionSlug } from "../../shared/collection.js";
import { readShopContext } from "../../shared/shop-section-context.js";
import { SHOP_STOREFRONT_CSS } from "../../shared/site-css.generated.js";

import { escapeHtml } from "../../../../packages/builtin/marketing/shared/html.js";
import {
  settingBool,
  settingNumber,
  settingText,
} from "../../../../packages/builtin/marketing/shared/section-schema.js";
import {
  gridClass,
  sectionHeading,
} from "../../../../packages/builtin/marketing/shared/sections/_common/html.js";
import {
  registerSiteSectionHtml,
  type SectionHtmlRenderer,
} from "../../../../packages/builtin/marketing/shared/sections/html.js";

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
          `<a href="${escapeHtml(product.href)}">${
            product.image_url
              ? `<img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.image_alt)}" />`
              : ""
          }<span>${escapeHtml(product.title)}</span>${
            showPrice && product.price
              ? `<span class="shop-price">${
                  product.compare_at_price
                    ? `<s class="shop-price-compare">${escapeHtml(product.compare_at_price)}</s> `
                    : ""
                }${escapeHtml(product.price)}</span>`
              : ""
          }</a>`,
      )
      .join("");
    return `${heading}<div class="shop-grid-list">${rows}</div>`;
  }
  const cards = items
    .map(
      (product) =>
        `<a class="card" href="${escapeHtml(product.href)}">${
          product.image_url
            ? `<img class="shop-card-image" src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.image_alt)}" />`
            : ""
        }<span class="title">${escapeHtml(product.title)}</span>${
          showPrice && product.price
            ? `<span class="muted shop-price">${
                product.compare_at_price
                  ? `<s class="shop-price-compare">${escapeHtml(product.compare_at_price)}</s> `
                  : ""
              }${escapeHtml(product.price)}</span>`
            : ""
        }</a>`,
    )
    .join("");
  return `${heading}<div class="${gridClass(settingNumber(s, "columns", 3))}">${cards}</div>`;
};

export function registerProductGridSection(): void {
  registerSiteSectionHtml(productGridSection, renderProductGridHtml, {
    css: SHOP_STOREFRONT_CSS,
  });
}
