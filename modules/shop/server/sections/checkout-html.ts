import { checkoutSection } from "../../shared/checkout-section.js";
import { readShopContext } from "../../shared/shop-section-context.js";
import { SHOP_STOREFRONT_CSS } from "../../shared/site-css.generated.js";
import { shopAlertHtml, shopBlockHeading, shopFieldHtml } from "./html-helpers.js";

import { escapeHtml } from "../../../../packages/builtin/marketing/shared/html.js";
import { settingText } from "../../../../packages/builtin/marketing/shared/section-schema.js";
import { sectionHeading } from "../../../../packages/builtin/marketing/shared/sections/_common/html.js";
import {
  registerSiteSectionHtml,
  type SectionHtmlRenderer,
} from "../../../../packages/builtin/marketing/shared/sections/html.js";

import type { SiteBlock } from "../../../../packages/builtin/marketing/shared/section-schema.js";
import type {
  ShopCheckoutView,
  ShopRenderContext,
} from "../../shared/shop-section-context.js";

function contactHtml(checkout: ShopCheckoutView, block: SiteBlock): string {
  return `<div>
  ${shopBlockHeading(block.settings)}
  ${shopFieldHtml({
    id: "shop-email",
    name: "email",
    label: settingText(block.settings, "email_label"),
    type: "email",
    required: true,
    value: checkout.values.email,
    autocomplete: "email",
  })}
</div>`;
}

function addressHtml(checkout: ShopCheckoutView, block: SiteBlock): string {
  if (!checkout.requires_shipping) return "";
  const s = block.settings;
  const v = checkout.values;
  return `<div>
  ${shopBlockHeading(s)}
  ${shopFieldHtml({ id: "shop-name", name: "name", label: settingText(s, "name_label"), required: true, value: v.name, autocomplete: "name" })}
  ${shopFieldHtml({ id: "shop-line1", name: "line1", label: settingText(s, "line1_label"), required: true, value: v.line1, autocomplete: "address-line1" })}
  ${shopFieldHtml({ id: "shop-city", name: "city", label: settingText(s, "city_label"), required: true, value: v.city, autocomplete: "address-level2" })}
  ${shopFieldHtml({ id: "shop-state", name: "state", label: settingText(s, "state_label"), value: v.state, autocomplete: "address-level1" })}
  ${shopFieldHtml({ id: "shop-postal", name: "postal_code", label: settingText(s, "postal_label"), required: true, value: v.postal_code, autocomplete: "postal-code" })}
  ${shopFieldHtml({ id: "shop-country", name: "country", label: settingText(s, "country_label"), required: true, value: v.country, placeholder: "US", autocomplete: "country" })}
  ${shopFieldHtml({ id: "shop-phone", name: "phone", label: settingText(s, "phone_label"), value: v.phone, type: "tel", autocomplete: "tel" })}
</div>`;
}

function shippingHtml(checkout: ShopCheckoutView, block: SiteBlock): string {
  if (!checkout.requires_shipping) return "";
  const s = block.settings;
  if (checkout.rates.length === 0) {
    const empty = settingText(s, "empty_text");
    return `<div>${shopBlockHeading(s)}${empty ? `<p class="shop-muted">${escapeHtml(empty)}</p>` : ""}</div>`;
  }
  const options = checkout.rates
    .map((rate) => {
      const selected =
        rate.id === checkout.values.shipping_rate_id ? " selected" : "";
      return `<option value="${escapeHtml(rate.id)}"${selected}>${escapeHtml(rate.label)} — ${escapeHtml(rate.price)}</option>`;
    })
    .join("");
  return `<div>
  ${shopBlockHeading(s)}
  <div class="shop-field">
    <label for="shop-rate">${escapeHtml(settingText(s, "heading") || "Shipping")}</label>
    <select id="shop-rate" name="shipping_rate_id" required>${options}</select>
  </div>
</div>`;
}

function summaryHtml(
  shop: ShopRenderContext,
  checkout: ShopCheckoutView,
  block: SiteBlock,
): string {
  const cart = shop.cart;
  const s = block.settings;
  if (!cart || cart.items.length === 0) {
    const empty = settingText(s, "empty_text");
    return `<aside class="shop-checkout-aside">${shopBlockHeading(s)}${empty ? `<p class="shop-muted">${escapeHtml(empty)}</p>` : ""}</aside>`;
  }
  const rows = cart.items
    .map(
      (item) =>
        `<p>${escapeHtml(item.title)} × ${item.quantity}<span class="shop-muted"> ${escapeHtml(item.line_total)}</span></p>`,
    )
    .join("");
  return `<aside class="shop-checkout-aside">
  ${shopBlockHeading(s)}
  ${rows}
  <p class="shop-price">${escapeHtml(settingText(s, "subtotal_label"))}: ${escapeHtml(cart.subtotal)}</p>
</aside>`;
}

function noteHtml(checkout: ShopCheckoutView, block: SiteBlock): string {
  return `<div>
  ${shopBlockHeading(block.settings)}
  ${shopFieldHtml({
    id: "shop-note",
    name: "note",
    label: settingText(block.settings, "note_label"),
    type: "textarea",
    value: checkout.values.note,
  })}
</div>`;
}

function payHtml(checkout: ShopCheckoutView, block: SiteBlock): string {
  const disabled =
    checkout.requires_shipping && checkout.rates.length === 0 ? " disabled" : "";
  return `<p><button class="btn" type="submit"${disabled}>${escapeHtml(settingText(block.settings, "submit_label"))}</button></p>`;
}

const renderCheckoutHtml: SectionHtmlRenderer = (section, ctx) => {
  const shop = readShopContext(ctx);
  const checkout = shop?.checkout;
  if (!shop || !checkout) return "";
  const canceled = checkout.canceled
    ? `<p class="shop-alert notice">${escapeHtml(settingText(section.settings, "canceled_text"))}</p>`
    : "";
  const summary = section.blocks.find((block) => block.type === "summary");
  const rest = section.blocks.filter((block) => block.type !== "summary");
  const main = rest
    .map((block) => {
      if (block.type === "contact") return contactHtml(checkout, block);
      if (block.type === "address") return addressHtml(checkout, block);
      if (block.type === "shipping") return shippingHtml(checkout, block);
      if (block.type === "note") return noteHtml(checkout, block);
      if (block.type === "pay") return payHtml(checkout, block);
      return "";
    })
    .join("");
  const aside = summary ? summaryHtml(shop, checkout, summary) : "";
  return `${shopAlertHtml(shop)}${canceled}${sectionHeading(section.settings)}
<form class="shop-checkout" method="post" action="${escapeHtml(shop.action_checkout)}">
  <div class="shop-checkout-main">${main}</div>
  ${aside}
</form>`;
};

export function registerCheckoutSection(): void {
  registerSiteSectionHtml(checkoutSection, renderCheckoutHtml, {
    css: SHOP_STOREFRONT_CSS,
  });
}
