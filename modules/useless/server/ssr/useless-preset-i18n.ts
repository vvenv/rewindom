/**
 * 服务端解析本模块预设里的 i18n key（`useless:site.index.title`）。
 */

import en from "../../client/locales/en.json" with { type: "json" };
import zhCN from "../../client/locales/zh-CN.json" with { type: "json" };

import {
  normalizeLocale,
  registerLocaleCatalog,
  resolveLocaleMessage,
  type AppLocale,
} from "@rewindom/module-sdk";

import type { PresetTranslateFn } from "@rewindom/builtin/marketing/shared/page-presets.types.js";

const MESSAGES: Record<string, Record<string, unknown>> = {
  "zh-CN": zhCN as Record<string, unknown>,
  en: en as Record<string, unknown>,
};

const NAMESPACE = "useless:";

registerLocaleCatalog("useless", MESSAGES);

export function createUselessPresetTranslator(
  locale: AppLocale,
): PresetTranslateFn {
  const primary = MESSAGES[normalizeLocale(locale)] ?? MESSAGES["zh-CN"]!;
  const fallback = MESSAGES["zh-CN"]!;

  return (raw: string): string => {
    const key = raw.startsWith(NAMESPACE) ? raw.slice(NAMESPACE.length) : raw;
    return (
      resolveLocaleMessage(primary, key) ??
      resolveLocaleMessage(fallback, key) ??
      raw
    );
  };
}
