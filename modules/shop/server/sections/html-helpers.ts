import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";
import { settingText } from "@rewindom/builtin/marketing/shared/section-schema.js";

import type { SettingValues } from "@rewindom/builtin/marketing/shared/section-settings.js";
import type { ShopRenderContext } from "../../shared/shop-section-context.js";

export function shopAlertHtml(shop: ShopRenderContext): string {
  if (shop.error) {
    return `<p class="shop-alert error">${escapeHtml(shop.error)}</p>`;
  }
  if (shop.notice) {
    return `<p class="shop-alert notice">${escapeHtml(shop.notice)}</p>`;
  }
  return "";
}

export function shopFieldHtml(input: {
  id: string;
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  value?: string;
  placeholder?: string;
  autocomplete?: string;
  min?: string;
}): string {
  const type = input.type ?? "text";
  const required = input.required ? " required" : "";
  const placeholder = input.placeholder
    ? ` placeholder="${escapeHtml(input.placeholder)}"`
    : "";
  const autocomplete = input.autocomplete
    ? ` autocomplete="${escapeHtml(input.autocomplete)}"`
    : "";
  const min = input.min != null ? ` min="${escapeHtml(input.min)}"` : "";
  if (type === "textarea") {
    return `<div class="shop-field">
  <label for="${escapeHtml(input.id)}">${escapeHtml(input.label)}</label>
  <textarea id="${escapeHtml(input.id)}" name="${escapeHtml(input.name)}" rows="3"${required}${placeholder}${autocomplete}>${escapeHtml(input.value ?? "")}</textarea>
</div>`;
  }
  const value = input.value ? ` value="${escapeHtml(input.value)}"` : "";
  return `<div class="shop-field">
  <label for="${escapeHtml(input.id)}">${escapeHtml(input.label)}</label>
  <input id="${escapeHtml(input.id)}" name="${escapeHtml(input.name)}" type="${escapeHtml(type)}"${required}${value}${placeholder}${autocomplete}${min} />
</div>`;
}

export function shopBlockHeading(settings: SettingValues): string {
  const heading = settingText(settings, "heading");
  return heading ? `<h3 class="shop-block-head">${escapeHtml(heading)}</h3>` : "";
}

export function shopPriceHtml(
  price: string,
  compareAt: string | null = null,
): string {
  if (!price) return "";
  const compare = compareAt
    ? `<s class="shop-price-compare">${escapeHtml(compareAt)}</s>`
    : "";
  return `<span class="shop-price">${compare}${escapeHtml(price)}</span>`;
}

export function shopMediaSlotHtml(
  url: string | null,
  alt: string,
  className: string,
): string {
  if (url) {
    return `<span class="${className}"><img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" /></span>`;
  }
  return `<span class="${className}" aria-hidden="true"></span>`;
}

export function shopTotalsHtml(
  rows: Array<{
    label: string;
    value: string;
    muted?: boolean;
    grand?: boolean;
  }>,
): string {
  const items = rows
    .map((row) => {
      const cls = row.grand ? ' class="is-grand"' : row.muted ? ' class="is-muted"' : "";
      return `<div${cls}><dt>${escapeHtml(row.label)}</dt><dd>${escapeHtml(row.value)}</dd></div>`;
    })
    .join("");
  return `<dl class="shop-totals">${items}</dl>`;
}
