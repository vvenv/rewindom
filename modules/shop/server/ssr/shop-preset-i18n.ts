/**
 * 服务端解析本模块预设里的 i18n key（`shop:storefront.catalog.title`）。
 *
 * 与 site-member 的 `member-preset-i18n.ts` 同一手法：预设只写 key，落成实际文案
 * 发生在创建 / 兜底渲染那一刻，按目标语言取。
 */

import en from "../../client/locales/en.json" with { type: "json" };
import zhCN from "../../client/locales/zh-CN.json" with { type: "json" };

import {
  normalizeLocale,
  registerLocaleCatalog,
  resolveLocaleMessage,
  type AppLocale,
} from "@rewindom/module-sdk";

import type { PresetTranslateFn } from "../../../../packages/builtin/marketing/shared/page-presets.types.js";

const MESSAGES: Record<string, Record<string, unknown>> = {
  "zh-CN": zhCN as Record<string, unknown>,
  en: en as Record<string, unknown>,
};

const NAMESPACE = "shop:";

/** 给 marketing 建页 / 重设版式解 `shop:storefront.catalog.title` 这类跨 ns key。 */
registerLocaleCatalog("shop", MESSAGES);

export function createShopPresetTranslator(
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
