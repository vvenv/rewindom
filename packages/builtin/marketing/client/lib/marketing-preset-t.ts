import { normalizeLocale, resolveLocaleMessage } from "@rewindom/shared";

import en from "../locales/en.json" with { type: "json" };
import zhCN from "../locales/zh-CN.json" with { type: "json" };

import type { PresetTranslateFn } from "../../shared/page-presets.types.js";

const MESSAGES: Record<string, Record<string, unknown>> = {
  "zh-CN": zhCN as Record<string, unknown>,
  en: en as Record<string, unknown>,
};

/** 按**站点语言**解预设文案（不是工作台语言）。 */
export function marketingPresetT(locale: string): PresetTranslateFn {
  const normalized = normalizeLocale(locale);
  const primary = MESSAGES[normalized] ?? MESSAGES["zh-CN"]!;
  const fallback = MESSAGES["zh-CN"]!;
  return (key) =>
    resolveLocaleMessage(primary, key) ??
    resolveLocaleMessage(fallback, key) ??
    key;
}
