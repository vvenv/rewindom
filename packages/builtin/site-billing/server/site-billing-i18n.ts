/**
 * 服务端解析本模块的 i18n key —— 与客户端 `site-billing` namespace 读**同一份** JSON。
 *
 * 同 `marketing/server/starter-i18n.ts` 与 `site-member/server/member-preset-i18n.ts`：
 * SSR 加载不了 i18next，但访客看到的每一句都该和编辑器里的那一句一致，所以直接读
 * locale JSON。文案的唯一真相源就是 `client/locales/*.json`，也就自动进了
 * `pnpm check:i18n` 的门禁。
 *
 * 带命名空间前缀的 key（`site-billing:account.title`）也认：模板页预设里写的就是
 * 那种形式，客户端建页时由 i18next 直接解开。
 */

import { normalizeLocale, resolveLocaleMessage, type AppLocale } from "@rewindom/shared";

import en from "../client/locales/en.json" with { type: "json" };
import zhCN from "../client/locales/zh-CN.json" with { type: "json" };

import type { PresetTranslateFn } from "../../marketing/shared/page-presets.types.js";

const MESSAGES: Record<string, Record<string, unknown>> = {
  "zh-CN": zhCN as Record<string, unknown>,
  en: en as Record<string, unknown>,
};

const NAMESPACE = "site-billing:";

export function createSiteBillingTranslator(
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
