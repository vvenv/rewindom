import {
  normalizeLocale,
  resolveLocaleMessage,
  type AppLocale,
} from "@be-water/shared";

import en from "../client/locales/en.json" with { type: "json" };
import zhCN from "../client/locales/zh-CN.json" with { type: "json" };

import type { PresetTranslateFn } from "../shared/page-presets.js";

const MESSAGES: Record<string, Record<string, unknown>> = {
  "zh-CN": zhCN as Record<string, unknown>,
  en: en as Record<string, unknown>,
};


/** 服务端解析站点起步模板 / 页面预设里的 i18n key（与客户端 `marketing` namespace 对齐）。 */
export function createStarterTranslator(locale: AppLocale): PresetTranslateFn {
  const primary = MESSAGES[locale] ?? MESSAGES["zh-CN"]!;
  const fallback = MESSAGES["zh-CN"]!;

  return (key: string): string =>
    resolveLocaleMessage(primary, key) ??
    resolveLocaleMessage(fallback, key) ??
    key;
}

export function starterLocaleForSite(defaultLocale: string | null | undefined): AppLocale {
  return normalizeLocale(defaultLocale);
}
