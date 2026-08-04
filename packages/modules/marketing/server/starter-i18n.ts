import { normalizeLocale, type AppLocale } from "@be-water/shared";

import en from "../client/locales/en.json";
import zhCN from "../client/locales/zh-CN.json";

import type { PresetTranslateFn } from "../shared/page-presets.js";

const MESSAGES: Record<string, Record<string, unknown>> = {
  "zh-CN": zhCN as Record<string, unknown>,
  en: en as Record<string, unknown>,
};

function resolveMessage(
  messages: Record<string, unknown>,
  key: string,
): string | undefined {
  let current: unknown = messages;
  for (const part of key.split(".")) {
    if (!current || typeof current !== "object" || !(part in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

/** 服务端解析站点起步模板 / 页面预设里的 i18n key（与客户端 `marketing` namespace 对齐）。 */
export function createStarterTranslator(locale: AppLocale): PresetTranslateFn {
  const primary = MESSAGES[locale] ?? MESSAGES["zh-CN"]!;
  const fallback = MESSAGES["zh-CN"]!;

  return (key: string): string =>
    resolveMessage(primary, key) ??
    resolveMessage(fallback, key) ??
    key;
}

export function starterLocaleForSite(defaultLocale: string | null | undefined): AppLocale {
  return normalizeLocale(defaultLocale);
}
