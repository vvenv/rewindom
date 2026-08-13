import type { AppLocale } from "@be-water/module-sdk";

import { isShopLocalizedMap, resolveShopLocaleText } from "../../shared/locale.js";

export function parseLocalizedInput(
  value: unknown,
  locale: AppLocale,
): Record<string, string> | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? { [locale]: trimmed } : null;
  }
  if (!isShopLocalizedMap(value)) return null;
  const cleaned: Record<string, string> = {};
  for (const [key, text] of Object.entries(value)) {
    const trimmed = text.trim();
    if (trimmed) cleaned[key] = trimmed;
  }
  return Object.keys(cleaned).length > 0 ? cleaned : null;
}

export function requireLocalizedInput(
  value: unknown,
  locale: AppLocale,
): Record<string, string> {
  return parseLocalizedInput(value, locale) ?? {};
}

export function displayTitle(
  value: unknown,
  locale: AppLocale,
  fallback = "",
): string {
  return resolveShopLocaleText(value, locale, fallback);
}

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
export const SKU_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u;
export const COUNTRY_RE = /^[A-Z]{2}$/u;
export const CURRENCY_RE = /^[A-Z]{3}$/u;
export const HS_CODE_RE = /^[0-9]{4,12}$/u;

export function normalizeCountry(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return COUNTRY_RE.test(code) ? code : null;
}

export function normalizeCurrency(value: unknown, fallback = "USD"): string {
  if (typeof value !== "string") return fallback;
  const code = value.trim().toUpperCase();
  return CURRENCY_RE.test(code) ? code : fallback;
}

export function normalizeHsCode(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return null;
  const digits = value.replace(/\s+/gu, "");
  return HS_CODE_RE.test(digits) ? digits : null;
}

export function asPositiveInt(value: unknown, fallback = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.trunc(value));
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatMoney(cents: number, currency: string, locale: AppLocale): string {
  try {
    return new Intl.NumberFormat(locale === "en" ? "en-US" : "zh-CN", {
      style: "currency",
      currency,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}
