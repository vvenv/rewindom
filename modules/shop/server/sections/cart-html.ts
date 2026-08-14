import { cartLinkBlock, cartSection } from "../../shared/cart-section.js";
import { readShopContext } from "../../shared/shop-section-context.js";
import { SHOP_STOREFRONT_CSS } from "../../shared/site-css.generated.js";
import { shopAlertHtml } from "./html-helpers.js";

import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";
import {
  settingBool,
  settingText,
} from "@rewindom/builtin/marketing/shared/section-schema.js";
import { registerChromeBlockHtml, type ChromeRenderInput } from "@rewindom/builtin/marketing/shared/sections/_common/chrome-html.js";
import { sectionHeading } from "@rewindom/builtin/marketing/shared/sections/_common/html.js";
import {
  registerSiteSectionHtml,
  type SectionHtmlRenderer,
} from "@rewindom/builtin/marketing/shared/sections/html.js";

import type { SiteBlock } from "@rewindom/builtin/marketing/shared/section-schema.js";
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

function discountFormHtml(
  cart: ShopCartView,
  shop: ShopRenderContext,
  block: SiteBlock,
): string {
  const codeLabel = settingText(block.settings, "discount_code_label");
  const applyLabel = settingText(block.settings, "discount_apply_label");
  if (!codeLabel && !applyLabel) return "";
  return `<form class="shop-discount" method="post" action="${escapeHtml(shop.action_cart)}">
    <input type="hidden" name="intent" value="discount" />
    <div class="shop-field">
      <label for="shop-discount-code">${escapeHtml(codeLabel || "Discount code")}</label>
      <input id="shop-discount-code" name="code" value="${escapeHtml(cart.discount_code ?? "")}" autocomplete="off" />
    </div>
    <button class="btn btn-secondary" type="submit">${escapeHtml(applyLabel || "Apply")}</button>
  </form>`;
}

function summaryHtml(
  cart: ShopCartView,
  shop: ShopRenderContext,
  block: SiteBlock,
): string {
  const discountLine =
    cart.discount && settingText(block.settings, "discount_label")
      ? `<p class="shop-muted">${escapeHtml(settingText(block.settings, "discount_label"))}${cart.discount_code ? ` (${escapeHtml(cart.discount_code)})` : ""}: −${escapeHtml(cart.discount)}</p>`
      : "";
  return `<div class="shop-cart-summary">
  ${discountFormHtml(cart, shop, block)}
  <p class="shop-price">${escapeHtml(settingText(block.settings, "subtotal_label"))}: ${escapeHtml(cart.subtotal)}</p>
  ${discountLine}
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

const CART_ICON = `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>`;

function renderCartLinkHtml(block: SiteBlock, input: ChromeRenderInput): string {
  const shop = readShopContext({ contributed: input.contributed });
  const href = shop?.cart_href ?? "/shop/cart";
  const label = settingText(block.settings, "label") || "Cart";
  const count =
    settingBool(block.settings, "show_count") && shop?.cart?.item_count
      ? shop.cart.item_count
      : 0;
  const badge =
    count > 0
      ? `<span class="shop-cart-count">${escapeHtml(String(count))}</span>`
      : "";
  return `<a class="btn btn-ghost shop-cart-link" href="${escapeHtml(href)}">${CART_ICON}<span>${escapeHtml(label)}</span>${badge}</a>`;
}

export function registerCartSections(): void {
  registerSiteSectionHtml(cartSection, renderCartHtml, {
    css: SHOP_STOREFRONT_CSS,
  });
  registerChromeBlockHtml(cartLinkBlock, renderCartLinkHtml, {
    css: SHOP_STOREFRONT_CSS,
  });
}
