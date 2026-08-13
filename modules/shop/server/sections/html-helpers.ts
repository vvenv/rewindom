import { escapeHtml } from "../../../../packages/builtin/marketing/shared/html.js";
import { settingText } from "../../../../packages/builtin/marketing/shared/section-schema.js";

import type { SettingValues } from "../../../../packages/builtin/marketing/shared/section-settings.js";
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
}): string {
  const type = input.type ?? "text";
  const required = input.required ? " required" : "";
  const placeholder = input.placeholder
    ? ` placeholder="${escapeHtml(input.placeholder)}"`
    : "";
  const autocomplete = input.autocomplete
    ? ` autocomplete="${escapeHtml(input.autocomplete)}"`
    : "";
  if (type === "textarea") {
    return `<div class="shop-field">
  <label for="${escapeHtml(input.id)}">${escapeHtml(input.label)}</label>
  <textarea id="${escapeHtml(input.id)}" name="${escapeHtml(input.name)}" rows="3"${required}${placeholder}${autocomplete}>${escapeHtml(input.value ?? "")}</textarea>
</div>`;
  }
  const value = input.value ? ` value="${escapeHtml(input.value)}"` : "";
  return `<div class="shop-field">
  <label for="${escapeHtml(input.id)}">${escapeHtml(input.label)}</label>
  <input id="${escapeHtml(input.id)}" name="${escapeHtml(input.name)}" type="${escapeHtml(type)}"${required}${value}${placeholder}${autocomplete} />
</div>`;
}

export function shopBlockHeading(settings: SettingValues): string {
  const heading = settingText(settings, "heading");
  return heading ? `<h3 class="shop-block-head">${escapeHtml(heading)}</h3>` : "";
}
