import { productSection } from "../../shared/product-section.js";
import { readShopContext } from "../../shared/shop-section-context.js";
import { SHOP_STOREFRONT_CSS } from "../../shared/site-css.generated.js";
import { shopFieldHtml } from "./html-helpers.js";

import { escapeHtml } from "../../../../packages/builtin/marketing/shared/html.js";
import {
  settingText,
  type SiteBlock,
} from "../../../../packages/builtin/marketing/shared/section-schema.js";
import { md } from "../../../../packages/builtin/marketing/shared/sections/_common/html.js";
import {
  registerSiteSectionHtml,
  type SectionHtmlRenderer,
} from "../../../../packages/builtin/marketing/shared/sections/html.js";

import type { SettingValues } from "../../../../packages/builtin/marketing/shared/section-settings.js";
import type { ShopProductDetailView, ShopRenderContext } from "../../shared/shop-section-context.js";

function buyHtml(
  product: ShopProductDetailView,
  shop: ShopRenderContext,
  settings: SettingValues,
): string {
  const soldOut = settingText(settings, "sold_out_label") || "Sold out";
  if (product.variants.length === 1) {
    const variant = product.variants[0]!;
    const disabled = variant.sold_out;
    return `<form class="shop-buy" method="post" action="${escapeHtml(shop.action_cart)}">
  <input type="hidden" name="intent" value="add" />
  <input type="hidden" name="variant_id" value="${escapeHtml(variant.id)}" />
  ${shopFieldHtml({
    id: "shop-qty",
    name: "quantity",
    label: settingText(settings, "quantity_label"),
    type: "number",
    required: true,
    value: "1",
  })}
  <button class="btn" type="submit"${disabled ? " disabled" : ""}>${escapeHtml(settingText(settings, "add_label"))}</button>
</form>`;
  }
  const options = product.variants
    .map((variant) => {
      const disabled = variant.sold_out ? " disabled" : "";
      const suffix = variant.sold_out ? ` (${escapeHtml(soldOut)})` : "";
      const compare = variant.compare_at_price
        ? ` (${escapeHtml(variant.compare_at_price)})`
        : "";
      return `<option value="${escapeHtml(variant.id)}"${disabled}>${escapeHtml(variant.label)} — ${escapeHtml(variant.price)}${compare}${suffix}</option>`;
    })
    .join("");
  return `<form class="shop-buy" method="post" action="${escapeHtml(shop.action_cart)}">
  <input type="hidden" name="intent" value="add" />
  <div class="shop-field">
    <label for="shop-variant">${escapeHtml(settingText(settings, "variant_label"))}</label>
    <select id="shop-variant" name="variant_id" required>${options}</select>
  </div>
  ${shopFieldHtml({
    id: "shop-qty",
    name: "quantity",
    label: settingText(settings, "quantity_label"),
    type: "number",
    required: true,
    value: "1",
  })}
  <button class="btn" type="submit">${escapeHtml(settingText(settings, "add_label"))}</button>
</form>`;
}

function renderBlock(
  block: SiteBlock,
  product: ShopProductDetailView,
  shop: ShopRenderContext,
): string {
  switch (block.type) {
    case "media": {
      if (product.images.length === 0) return "";
      const imgs = product.images
        .map(
          (image, index) =>
            `<img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.alt)}"${index === 0 ? ' class="shop-gallery-main"' : ""} />`,
        )
        .join("");
      return `<div class="shop-gallery">${imgs}</div>`;
    }
    case "title":
      return `<h1>${escapeHtml(product.title)}</h1>${
        product.subtitle
          ? `<p class="shop-product-subtitle">${escapeHtml(product.subtitle)}</p>`
          : ""
      }`;
    case "price": {
      const first = product.variants.find((variant) => !variant.sold_out) ?? product.variants[0];
      if (!first) return "";
      const compare = first.compare_at_price
        ? `<s class="shop-price-compare">${escapeHtml(first.compare_at_price)}</s> `
        : "";
      return `<p class="shop-price">${compare}${escapeHtml(first.price)}</p>`;
    }
    case "description":
      return product.description
        ? `<div class="shop-product-description prose">${md(product.description)}</div>`
        : "";
    case "buy":
      return buyHtml(product, shop, block.settings);
    default:
      return "";
  }
}

const renderProductHtml: SectionHtmlRenderer = (section, ctx) => {
  const shop = readShopContext(ctx);
  const product = shop?.product;
  if (!shop || !product) return "";
  const buy = section.blocks.find((block) => block.type === "buy");
  const rest = section.blocks.filter((block) => block.type !== "buy");
  const main = rest
    .map((block) => renderBlock(block, product, shop))
    .filter(Boolean)
    .join("");
  const buyCol = buy ? renderBlock(buy, product, shop) : "";
  return `<div class="shop-product">
  <div class="shop-product-main">${main}</div>
  ${buyCol ? `<div class="shop-product-buy">${buyCol}</div>` : ""}
</div>`;
};

export function registerProductSection(): void {
  registerSiteSectionHtml(productSection, renderProductHtml, {
    css: SHOP_STOREFRONT_CSS,
  });
}
