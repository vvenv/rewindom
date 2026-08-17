import { readShopContext } from "../shop-section-context.js";
import {
  shopAlertHtml,
  shopBlockHeading,
  shopFieldHtml,
  shopTotalsHtml,
} from "./html-helpers.js";

import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";
import { settingText } from "@rewindom/builtin/marketing/shared/section-schema.js";
import { sectionHeading } from "@rewindom/builtin/marketing/shared/sections/_common/html.js";
import type { SectionHtmlRenderer } from "@rewindom/builtin/marketing/shared/sections/render-context.js";

import type { SiteBlock } from "@rewindom/builtin/marketing/shared/section-schema.js";
import type {
  ShopCheckoutView,
  ShopRenderContext,
} from "../shop-section-context.js";

function contactHtml(checkout: ShopCheckoutView, block: SiteBlock): string {
  return `<div class="shop-group">
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
  return `<div class="shop-group">
  ${shopBlockHeading(s)}
  ${shopFieldHtml({ id: "shop-name", name: "name", label: settingText(s, "name_label"), required: true, value: v.name, autocomplete: "name" })}
  ${shopFieldHtml({ id: "shop-line1", name: "line1", label: settingText(s, "line1_label"), required: true, value: v.line1, autocomplete: "address-line1" })}
  <div class="shop-field-row">
    ${shopFieldHtml({ id: "shop-city", name: "city", label: settingText(s, "city_label"), required: true, value: v.city, autocomplete: "address-level2" })}
    ${shopFieldHtml({ id: "shop-state", name: "state", label: settingText(s, "state_label"), value: v.state, autocomplete: "address-level1" })}
  </div>
  <div class="shop-field-row">
    ${shopFieldHtml({ id: "shop-postal", name: "postal_code", label: settingText(s, "postal_label"), required: true, value: v.postal_code, autocomplete: "postal-code" })}
    ${shopFieldHtml({ id: "shop-country", name: "country", label: settingText(s, "country_label"), required: true, value: v.country, placeholder: "US", autocomplete: "country" })}
  </div>
  ${shopFieldHtml({ id: "shop-phone", name: "phone", label: settingText(s, "phone_label"), value: v.phone, type: "tel", autocomplete: "tel" })}
</div>`;
}

function shippingHtml(checkout: ShopCheckoutView, block: SiteBlock): string {
  if (!checkout.requires_shipping) return "";
  const s = block.settings;
  if (checkout.rates.length === 0) {
    const empty = settingText(s, "empty_text");
    return `<div class="shop-group">${shopBlockHeading(s)}${empty ? `<p class="shop-muted">${escapeHtml(empty)}</p>` : ""}</div>`;
  }
  const selectedId = checkout.rates.some(
    (rate) => rate.id === checkout.values.shipping_rate_id,
  )
    ? checkout.values.shipping_rate_id
    : checkout.rates[0]?.id;
  const options = checkout.rates
    .map((rate) => {
      const checked = rate.id === selectedId ? " checked" : "";
      return `<label class="shop-rate">
  <input type="radio" name="shipping_rate_id" value="${escapeHtml(rate.id)}" required${checked} />
  <span class="shop-rate-label">${escapeHtml(rate.label)}</span>
  <span class="shop-rate-price">${escapeHtml(rate.price)}</span>
</label>`;
    })
    .join("");
  return `<div class="shop-group">
  ${shopBlockHeading(s)}
  <div class="shop-rates">${options}</div>
</div>`;
}

function discountFormHtml(
  shop: ShopRenderContext,
  block: SiteBlock,
): string {
  const cart = shop.cart;
  const codeLabel = settingText(block.settings, "discount_code_label");
  const applyLabel = settingText(block.settings, "discount_apply_label");
  if (!cart || (!codeLabel && !applyLabel)) return "";
  return `<form class="shop-discount" method="post" action="${escapeHtml(shop.action_checkout)}">
    <input type="hidden" name="intent" value="discount" />
    <div class="shop-field">
      <label for="shop-checkout-discount">${escapeHtml(codeLabel || "Discount code")}</label>
      <input id="shop-checkout-discount" name="code" value="${escapeHtml(cart.discount_code ?? "")}" autocomplete="off" />
    </div>
    <button class="btn btn-secondary" type="submit">${escapeHtml(applyLabel || "Apply")}</button>
  </form>`;
}

function summaryHtml(shop: ShopRenderContext, block: SiteBlock): string {
  const cart = shop.cart;
  const s = block.settings;
  if (!cart || cart.items.length === 0) {
    const empty = settingText(s, "empty_text");
    return `<aside class="shop-checkout-aside">${shopBlockHeading(s)}${empty ? `<p class="shop-muted">${escapeHtml(empty)}</p>` : ""}</aside>`;
  }
  const rows = cart.items
    .map(
      (item) =>
        `<div class="shop-aside-line"><span>${escapeHtml(item.title)} <span class="shop-muted">× ${item.quantity}</span></span><span>${escapeHtml(item.line_total)}</span></div>`,
    )
    .join("");
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
  return `<aside class="shop-checkout-aside">
  ${shopBlockHeading(s)}
  <div class="shop-aside-lines">${rows}</div>
  ${discountFormHtml(shop, block)}
  ${totals}
</aside>`;
}

function noteHtml(checkout: ShopCheckoutView, block: SiteBlock): string {
  return `<div class="shop-group">
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
  return `<div class="shop-pay"><button class="btn shop-cta" type="submit"${disabled}>${escapeHtml(settingText(block.settings, "submit_label"))}</button></div>`;
}

export const renderCheckoutHtml: SectionHtmlRenderer = (section, ctx) => {
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
  const aside = summary ? summaryHtml(shop, summary) : "";
  return `${shopAlertHtml(shop)}${canceled}${sectionHeading(section.settings)}
<div class="shop-checkout">
  <form class="shop-checkout-main" method="post" action="${escapeHtml(shop.action_checkout)}">${main}</form>
  ${aside}
</div>`;
};

