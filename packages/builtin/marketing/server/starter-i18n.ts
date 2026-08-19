import {
  normalizeLocale,
  resolveLocaleMessage,
  translateRegisteredKey,
  type AppLocale,
} from "@rewindom/shared";

import { MARKETING_LOCALE_MESSAGES } from "../shared/i18n-catalog.js";

import type { PresetTranslateFn } from "../shared/page-presets.js";

const MESSAGES = MARKETING_LOCALE_MESSAGES;

/**
 * 服务端解析站点起步模板 / 页面预设里的 i18n key。
 *
 * marketing 自己的预设也带 `marketing:` 前缀（`marketing:preset.home.title`）；
 * 贡献方的模板页带 `site-member:login.title` 这种前缀，由各模块
 * `registerLocaleCatalog` 解开。建租户快照 / 重设版式都走这里——解不开时
 * `t()` 仍返回 key 本身（调用方可据此判断失败）；真正写入 `MarketingPage`
 * 必须再过 `resolvedStarterText`，不能把 key 当标题存进去。未带 ns 的旧 key
 * 仍回落到本模块 JSON。
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

/**
 * 写入页面标题 / 摘要用。`t()` 解不开时会把 `ns:key` 原样返回——那不是给访客看的
 * 句子，不能进 `MarketingPage`。
 */
export function resolvedStarterText(t: PresetTranslateFn, key: string): string {
  const text = t(key).trim();
  return !text || text === key ? "" : text;
}

/**
 * 重设版式时：空标题、或标题仍是库存 key 原文，才换成当前语言的 catalog 句。
 * 租户改过的句子原样保留。
 */
export function persistablePresetCopy(
  t: PresetTranslateFn,
  key: string,
  existing?: string,
): string {
  const current = existing?.trim() ?? "";
  if (!current || current === key) return resolvedStarterText(t, key);
  return current;
}

export function starterLocaleForSite(defaultLocale: string | null | undefined): AppLocale {
  return normalizeLocale(defaultLocale);
}
