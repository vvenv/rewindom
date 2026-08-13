import { productGridSection } from "../../shared/product-grid-section.js";
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
  const items =
    limit > 0 ? shop.products.slice(0, limit) : shop.products;
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
          `<a href="${escapeHtml(product.href)}"><span>${escapeHtml(product.title)}</span>${showPrice && product.price ? `<span class="shop-price">${escapeHtml(product.price)}</span>` : ""}</a>`,
      )
      .join("");
    return `${heading}<div class="shop-grid-list">${rows}</div>`;
  }
  const cards = items
    .map(
      (product) =>
        `<a class="card" href="${escapeHtml(product.href)}"><span class="title">${escapeHtml(product.title)}</span>${showPrice && product.price ? `<span class="muted shop-price">${escapeHtml(product.price)}</span>` : ""}</a>`,
    )
    .join("");
  return `${heading}<div class="${gridClass(settingNumber(s, "columns", 3))}">${cards}</div>`;
};

export function registerProductGridSection(): void {
  registerSiteSectionHtml(productGridSection, renderProductGridHtml, {
    css: SHOP_STOREFRONT_CSS,
  });
}
