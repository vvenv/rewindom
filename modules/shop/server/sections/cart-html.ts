import { cartLinkSection, cartSection } from "../../shared/cart-section.js";
import { readShopContext } from "../../shared/shop-section-context.js";
import { SHOP_STOREFRONT_CSS } from "../../shared/site-css.generated.js";
import { shopAlertHtml } from "./html-helpers.js";

import { escapeHtml } from "../../../../packages/builtin/marketing/shared/html.js";
import { settingBool, settingText } from "../../../../packages/builtin/marketing/shared/section-schema.js";
import { sectionHeading } from "../../../../packages/builtin/marketing/shared/sections/_common/html.js";
import {
  registerSiteSectionHtml,
  type SectionHtmlRenderer,
} from "../../../../packages/builtin/marketing/shared/sections/html.js";

import type { SiteBlock } from "../../../../packages/builtin/marketing/shared/section-schema.js";
import type { ShopCartView, ShopRenderContext } from "../../shared/shop-section-context.js";

function linesHtml(
  cart: ShopCartView,
  shop: ShopRenderContext,
  block: SiteBlock,
): string {
  const s = block.settings;
  const rows = cart.items
    .map(
      (item) => `<tr>
        <td>${
          item.image_url
            ? `<img class="shop-line-image" src="${escapeHtml(item.image_url)}" alt="" />`
            : ""
        }${escapeHtml(item.title)}<div class="shop-muted">${escapeHtml(item.sku)}</div></td>
        <td>
          <form class="shop-qty" method="post" action="${escapeHtml(shop.action_cart)}">
            <input type="hidden" name="intent" value="update" />
            <input type="hidden" name="item_id" value="${escapeHtml(item.id)}" />
            <input type="number" name="quantity" value="${item.quantity}" min="0" />
            <button class="btn btn-secondary" type="submit">${escapeHtml(settingText(s, "update_label"))}</button>
          </form>
        </td>
        <td>${escapeHtml(item.line_total)}</td>
      </tr>`,
    )
    .join("");
  return `<table class="shop-table">
  <thead><tr>
    <th>${escapeHtml(settingText(s, "item_label"))}</th>
    <th>${escapeHtml(settingText(s, "qty_label"))}</th>
    <th>${escapeHtml(settingText(s, "total_label"))}</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>`;
}

function summaryHtml(
  cart: ShopCartView,
  shop: ShopRenderContext,
  block: SiteBlock,
): string {
  return `<div class="shop-cart-summary">
  <p class="shop-price">${escapeHtml(settingText(block.settings, "subtotal_label"))}: ${escapeHtml(cart.subtotal)}</p>
  <p><a class="btn" href="${escapeHtml(shop.checkout_href)}">${escapeHtml(settingText(block.settings, "checkout_label"))}</a></p>
</div>`;
}

const renderCartHtml: SectionHtmlRenderer = (section, ctx) => {
  const shop = readShopContext(ctx);
  if (!shop) return "";
  const s = section.settings;
  const heading = sectionHeading(s);
  const cart = shop.cart;
  if (!cart || cart.items.length === 0) {
    const empty = settingText(s, "empty_text");
    const cont = settingText(s, "continue_label");
    return `${shopAlertHtml(shop)}${heading}${empty ? `<p class="shop-muted">${escapeHtml(empty)}</p>` : ""}
      ${cont ? `<p><a href="${escapeHtml(shop.shop_href)}">${escapeHtml(cont)}</a></p>` : ""}`;
  }
  const body = section.blocks
    .map((block) => {
      if (block.type === "lines") return linesHtml(cart, shop, block);
      if (block.type === "summary") return summaryHtml(cart, shop, block);
      return "";
    })
    .join("");
  return `${shopAlertHtml(shop)}${heading}${body}`;
};

const renderCartLinkHtml: SectionHtmlRenderer = (section, ctx) => {
  const shop = readShopContext(ctx);
  const href = shop?.cart_href ?? "/shop/cart";
  const label = settingText(section.settings, "label") || "Cart";
  const count =
    settingBool(section.settings, "show_count") && shop?.cart?.item_count
      ? ` (${shop.cart.item_count})`
      : "";
  return `<p class="shop-cart-link"><a href="${escapeHtml(href)}">${escapeHtml(label)}${escapeHtml(count)}</a></p>`;
};

export function registerCartSections(): void {
  registerSiteSectionHtml(cartSection, renderCartHtml, {
    css: SHOP_STOREFRONT_CSS,
  });
  registerSiteSectionHtml(cartLinkSection, renderCartLinkHtml, {
    css: SHOP_STOREFRONT_CSS,
  });
}
