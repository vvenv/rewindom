import { getI18n } from "@be-water/client-kit";
import { normalizeLocale } from "@be-water/shared";

import { formatMemberPrice } from "../../shared/site-billing.js";

/** 工作台里的展示格式跟界面语言走（公开面走站点语言，见 SSR 侧）。 */
function uiLocale() {
  return normalizeLocale(getI18n().language);
}

export function formatPlanPrice(
  amountCents: number,
  currency: string,
): string {
  return formatMemberPrice(amountCents, currency, uiLocale());
}

export function formatSiteBillingDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(uiLocale() === "en" ? "en-US" : "zh-CN");
}

/**
 * 元 ↔ 分。
 *
 * 表单里填的是元（`99.9`），库里存的是分——`99.9 * 100` 在浮点下是 9989.999…，
 * 直接 `Math.round` 掉，别让一分钱的误差进到账上。
 */
export function yuanToCents(input: string): number {
  const value = Number(input);
  if (!Number.isFinite(value)) return Number.NaN;
  return Math.round(value * 100);
}

export function centsToYuan(cents: number): string {
  return (cents / 100).toString();
}
