import { readShopContext } from "../shop-section-context.js";
import {
  shopAlertHtml,
  shopMediaSlotHtml,
  shopTotalsHtml,
} from "./html-helpers.js";

import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";
import {
  settingBool,
  settingText,
  type SiteBlock,
} from "@rewindom/builtin/marketing/shared/section-schema.js";
import type { ChromeBlockHtmlRenderer } from "@rewindom/builtin/marketing/shared/sections/_common/chrome-html.js";
import { sectionHeading } from "@rewindom/builtin/marketing/shared/sections/_common/html.js";
import { siteHref } from "@rewindom/builtin/marketing/shared/site-locale.js";
import type { SectionHtmlRenderer } from "@rewindom/builtin/marketing/shared/sections/render-context.js";
import type { ShopCartView, ShopRenderContext } from "../shop-section-context.js";

function linesHtml(
  cart: ShopCartView,
  shop: ShopRenderContext,
  block: SiteBlock,
): string {
  const s = block.settings;
  const rows = cart.items
    .map(
      (item) => `<li class="shop-line">
        ${shopMediaSlotHtml(item.image_url, "", "shop-line-media")}
        <div class="shop-line-body">
          <div class="shop-line-top">
            <div>
              <div class="shop-line-title">${escapeHtml(item.title)}</div>
              ${item.sku ? `<p class="shop-line-sku">${escapeHtml(item.sku)}</p>` : ""}
            </div>
            <div class="shop-line-total">${escapeHtml(item.line_total)}</div>
          </div>
          <form class="shop-qty" method="post" action="${escapeHtml(shop.action_cart)}">
            <input type="hidden" name="intent" value="update" />
            <input type="hidden" name="item_id" value="${escapeHtml(item.id)}" />
            <input id="shop-qty-${escapeHtml(item.id)}" type="number" name="quantity" value="${item.quantity}" min="0" aria-label="${escapeHtml(settingText(s, "qty_label"))}" />
            <button class="btn btn-secondary" type="submit">${escapeHtml(settingText(s, "update_label"))}</button>
          </form>
        </div>
      </li>`,
    )
    .join("");
  return `<ul class="shop-lines">${rows}</ul>`;
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
  const s = block.settings;
  const totals = shopTotalsHtml([
    {
      label: settingText(s, "subtotal_label"),
      value: cart.subtotal,
    },
    ...(cart.discount && settingText(s, "discount_label")
      ? [
          {
            label: `${settingText(s, "discount_label")}${cart.discount_code ? ` (${cart.discount_code})` : ""}`,
            value: `−${cart.discount}`,
            muted: true,
          },
        ]
      : []),
  ]);
  return `<div class="shop-cart-summary">
  ${discountFormHtml(cart, shop, block)}
  ${totals}
  <a class="btn shop-cta" href="${escapeHtml(shop.checkout_href)}">${escapeHtml(settingText(s, "checkout_label"))}</a>
</div>`;
}

export const renderCartHtml: SectionHtmlRenderer = (section, ctx) => {
  const shop = readShopContext(ctx);
  if (!shop) return "";
  const s = section.settings;
  const heading = sectionHeading(s);
  const cart = shop.cart;
  if (!cart || cart.items.length === 0) {
    const empty = settingText(s, "empty_text");
    const cont = settingText(s, "continue_label");
    return `${shopAlertHtml(shop)}${heading}<div class="shop-empty">${
      empty ? `<p class="shop-muted">${escapeHtml(empty)}</p>` : ""
    }${cont ? `<a class="btn" href="${escapeHtml(siteHref(shop.shop_href, ctx))}">${escapeHtml(cont)}</a>` : ""}</div>`;
  }
  const lines = section.blocks.find((block) => block.type === "lines");
  const summary = section.blocks.find((block) => block.type === "summary");
  return `${shopAlertHtml(shop)}${heading}<div class="shop-cart">
  ${lines ? `<div class="shop-cart-main">${linesHtml(cart, shop, lines)}</div>` : ""}
  ${summary ? summaryHtml(cart, shop, summary) : ""}
</div>`;
};

const CART_ICON = `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>`;

export const renderCartLinkHtml: ChromeBlockHtmlRenderer = (block, input) => {
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
};

