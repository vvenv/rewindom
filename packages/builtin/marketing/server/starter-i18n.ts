import {
  normalizeLocale,
  resolveLocaleMessage,
  translateRegisteredKey,
  type AppLocale,
} from "@rewindom/shared";

import en from "../client/locales/en.json" with { type: "json" };
import zhCN from "../client/locales/zh-CN.json" with { type: "json" };

import type { PresetTranslateFn } from "../shared/page-presets.js";

const MESSAGES: Record<string, Record<string, unknown>> = {
  "zh-CN": zhCN as Record<string, unknown>,
  en: en as Record<string, unknown>,
};


/**
 * 服务端解析站点起步模板 / 页面预设里的 i18n key。
 *
 * marketing 自己的预设不带 ns（`preset.home.title`）；贡献方的模板页带
 * `site-member:login.title` 这种前缀，由各模块 `registerLocaleCatalog` 解开。
 * 建租户快照 / 重设版式都走这里——解不开就会把 key 原样写进页面标题。
 */
export function createStarterTranslator(locale: AppLocale): PresetTranslateFn {
  const normalized = normalizeLocale(locale);
  const primary = MESSAGES[normalized] ?? MESSAGES["zh-CN"]!;
  const fallback = MESSAGES["zh-CN"]!;

  return (key: string): string =>
    translateRegisteredKey(normalized, key) ??
    resolveLocaleMessage(primary, key) ??
    resolveLocaleMessage(fallback, key) ??
    key;
}

export function starterLocaleForSite(defaultLocale: string | null | undefined): AppLocale {
  return normalizeLocale(defaultLocale);
}
