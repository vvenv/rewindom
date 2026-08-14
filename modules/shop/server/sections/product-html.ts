import { productSection } from "../../shared/product-section.js";
import { readShopContext } from "../../shared/shop-section-context.js";
import { SHOP_STOREFRONT_CSS } from "../../shared/site-css.generated.js";
import { shopFieldHtml, shopPriceHtml } from "./html-helpers.js";

import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";
import {
  settingText,
  type SiteBlock,
} from "@rewindom/builtin/marketing/shared/section-schema.js";
import { md } from "@rewindom/builtin/marketing/shared/sections/_common/html.js";
import {
  registerSiteSectionHtml,
  type SectionHtmlRenderer,
} from "@rewindom/builtin/marketing/shared/sections/html.js";

import type { SettingValues } from "@rewindom/builtin/marketing/shared/section-settings.js";
import type { ShopProductDetailView, ShopRenderContext } from "../../shared/shop-section-context.js";

function galleryHtml(product: ShopProductDetailView): string {
  if (product.images.length === 0) return "";
  if (product.images.length === 1) {
    const image = product.images[0]!;
    return `<div class="shop-gallery">
  <div class="shop-gallery-stage">
    <img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.alt)}" />
  </div>
</div>`;
  }
  const stage = product.images
    .map((image, index) => {
      const checked = index === 0 ? " checked" : "";
      return `<input type="radio" name="shop-gallery" id="shop-g-${index}"${checked} />
    <img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.alt)}" />`;
    })
    .join("");
  const thumbs = product.images
    .map(
      (image, index) =>
        `<label for="shop-g-${index}"><img src="${escapeHtml(image.url)}" alt="" /></label>`,
    )
    .join("");
  return `<div class="shop-gallery">
  <div class="shop-gallery-stage">${stage}</div>
  <div class="shop-gallery-thumbs">${thumbs}</div>
</div>`;
}

function variantPickerHtml(
  product: ShopProductDetailView,
  settings: SettingValues,
): string {
  const soldOut = settingText(settings, "sold_out_label") || "Sold out";
  const firstAvailable = product.variants.find((variant) => !variant.sold_out);
  const options = product.variants
    .map((variant) => {
      const disabled = variant.sold_out ? " disabled" : "";
      const checked =
        variant.id === firstAvailable?.id ? " checked" : "";
      const soldClass = variant.sold_out ? " is-sold-out" : "";
      const price = variant.sold_out
        ? escapeHtml(soldOut)
        : escapeHtml(variant.price);
      return `<label class="shop-variant${soldClass}">
  <input type="radio" name="variant_id" value="${escapeHtml(variant.id)}" required${disabled}${checked} />
  <span class="shop-variant-name">${escapeHtml(variant.label)}</span>
  <span class="shop-variant-price">${price}</span>
</label>`;
    })
    .join("");
  return `<fieldset class="shop-field">
  <legend>${escapeHtml(settingText(settings, "variant_label"))}</legend>
  <div class="shop-variants">${options}</div>
</fieldset>`;
}

function buyHtml(
  product: ShopProductDetailView,
  shop: ShopRenderContext,
  settings: SettingValues,
): string {
  const allSoldOut =
    product.variants.length === 0 ||
    product.variants.every((variant) => variant.sold_out);
  const qty = shopFieldHtml({
    id: "shop-qty",
    name: "quantity",
    label: settingText(settings, "quantity_label"),
    type: "number",
    required: true,
    value: "1",
    min: "1",
  });
  const submit = `<button class="btn shop-cta" type="submit"${allSoldOut ? " disabled" : ""}>${escapeHtml(settingText(settings, "add_label"))}</button>`;
  const actions = `<div class="shop-buy-actions">${qty}${submit}</div>`;
  if (product.variants.length === 1) {
    const variant = product.variants[0]!;
    return `<form class="shop-buy" method="post" action="${escapeHtml(shop.action_cart)}">
  <input type="hidden" name="intent" value="add" />
  <input type="hidden" name="variant_id" value="${escapeHtml(variant.id)}" />
  ${actions}
</form>`;
  }
  return `<form class="shop-buy" method="post" action="${escapeHtml(shop.action_cart)}">
  <input type="hidden" name="intent" value="add" />
  ${variantPickerHtml(product, settings)}
  ${actions}
</form>`;
}

function renderBlock(
  block: SiteBlock,
  product: ShopProductDetailView,
  shop: ShopRenderContext,
): string {
  switch (block.type) {
    case "media":
      return galleryHtml(product);
    case "title":
      return `<div>
  <h1>${escapeHtml(product.title)}</h1>${
    product.subtitle
      ? `<p class="shop-product-subtitle">${escapeHtml(product.subtitle)}</p>`
      : ""
  }
</div>`;
    case "price": {
      const first =
        product.variants.find((variant) => !variant.sold_out) ??
        product.variants[0];
      if (!first) return "";
      return shopPriceHtml(first.price, first.compare_at_price);
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
