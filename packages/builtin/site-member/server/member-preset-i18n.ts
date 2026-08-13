/**
 * 服务端解析本模块预设里的 i18n key（`site-member:template.login.heading`）。
 *
 * 与 marketing 的 `starter-i18n.ts` 同一手法：预设只写 key，落成实际文案发生在
 * **创建 / 兜底渲染**那一刻，按目标语言取。带命名空间前缀是因为这些 key 要能被
 * 客户端的 i18next 直接解开（编辑器里建页也走同一份预设）。
 */

import {
  normalizeLocale,
  resolveLocaleMessage,
  type AppLocale,
} from "@rewindom/shared";

import en from "../client/locales/en.json" with { type: "json" };
import zhCN from "../client/locales/zh-CN.json" with { type: "json" };

import type { PresetTranslateFn } from "../../marketing/shared/page-presets.types.js";

const MESSAGES: Record<string, Record<string, unknown>> = {
  "zh-CN": zhCN as Record<string, unknown>,
  en: en as Record<string, unknown>,
};

const NAMESPACE = "site-member:";


export function createMemberPresetTranslator(
  locale: AppLocale,
): PresetTranslateFn {
  const primary = MESSAGES[normalizeLocale(locale)] ?? MESSAGES["zh-CN"]!;
  const fallback = MESSAGES["zh-CN"]!;

  return (raw: string): string => {
    const key = raw.startsWith(NAMESPACE) ? raw.slice(NAMESPACE.length) : raw;
    return resolveLocaleMessage(primary, key) ?? resolveLocaleMessage(fallback, key) ?? raw;
  };
}
