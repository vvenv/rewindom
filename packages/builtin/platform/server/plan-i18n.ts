/**
 * 服务端取套餐文案 —— 与客户端 `platform` namespace 读的是**同一份** JSON。
 *
 * 套餐名不进 `PRICING_PLANS`：那张表管的是结构（价格、配额、开关），文案归 i18n。
 * 两边各存一份的下场是英文站渲染出「基础版」——官网的套餐段是 SSR 的，它加载不了
 * i18next，只能像 `starter-i18n.ts` / `member-preset-i18n.ts` 那样直接读 locale JSON。
 *
 * 于是文案的唯一真相源就是 `client/locales/*.json`，也就自动进了 `pnpm check:i18n`。
 */

import { normalizeLocale, resolveLocaleMessage, type AppLocale } from "@be-water/shared";

import en from "../client/locales/en.json" with { type: "json" };
import zhCN from "../client/locales/zh-CN.json" with { type: "json" };

const MESSAGES: Record<string, Record<string, unknown>> = {
  "zh-CN": zhCN as Record<string, unknown>,
  en: en as Record<string, unknown>,
};

function lookup(locale: AppLocale, key: string): string | undefined {
  const primary = MESSAGES[normalizeLocale(locale)] ?? MESSAGES["zh-CN"]!;
  return (
    resolveLocaleMessage(primary, key) ??
    resolveLocaleMessage(MESSAGES["zh-CN"]!, key)
  );
}

/** 套餐名；认不出的 slug 原样返回（下游产品仓可能有自己的套餐）。 */
export function planName(slug: string, locale: AppLocale): string {
  return lookup(locale, `plans.${slug}.name`) ?? slug;
}

export function planDescription(slug: string, locale: AppLocale): string {
  return lookup(locale, `plans.${slug}.description`) ?? "";
}
