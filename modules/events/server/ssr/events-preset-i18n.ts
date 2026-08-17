/**
 * 服务端解析本模块的 i18n key（`events:sections.rising`）。
 *
 * 两个用途：
 * 1. marketing 建页 / 重设版式时把预设里的 key 落成实际文案；
 * 2. 建段上下文时把状态名、主题名、时间线 code 落成当前语言——段渲染器是同步的、
 *    也拿不到 i18next，文案必须在这一步就定稿。
 *
 * 文案真源仍是 `client/locales/*.json` 那两份（因此自动进 `pnpm check:i18n` 门禁），
 * 这里只是服务端的读取方式。
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

const NAMESPACE = "events:";

/** 给 marketing 建页 / 重设版式解 `events:site.index.title` 这类跨 ns key。 */
registerLocaleCatalog("events", MESSAGES);

/** 直接按 key 取本模块文案（不带 ns 前缀），缺失时回落 zh-CN，再回落 key 本身。 */
export function eventsMessage(
  locale: AppLocale,
  key: string,
  params?: Record<string, string | number>,
): string {
  const primary = MESSAGES[normalizeLocale(locale)] ?? MESSAGES["zh-CN"]!;
  const fallback = MESSAGES["zh-CN"]!;
  const raw =
    resolveLocaleMessage(primary, key) ??
    resolveLocaleMessage(fallback, key) ??
    key;
  if (!params) {
    return raw;
  }
  return Object.entries(params).reduce(
    (text, [name, value]) => text.replaceAll(`{{${name}}}`, String(value)),
    raw,
  );
}

export function createEventsPresetTranslator(
  locale: AppLocale,
): PresetTranslateFn {
  return (raw: string): string =>
    eventsMessage(locale, raw.startsWith(NAMESPACE) ? raw.slice(NAMESPACE.length) : raw);
}
