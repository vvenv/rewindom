import { DEFAULT_LOCALE, normalizeLocale, type AppLocale } from "./locale.js";

/**
 * 从一份 locale JSON 里按点分 key 取文案。
 *
 * 服务端没有 i18next，但常常要拿到与客户端**同一份**文案：SSR 渲染的段、页面预设
 * 落地时的默认值、发给访客的整句提示。这些地方一律直接 import 模块自己的
 * `client/locales/*.json` 再走本函数 —— 文案的唯一真相源就是那两份 JSON，
 * 也就自动进了 `pnpm check:i18n` 的门禁。
 *
 * 这段解析原本在 `marketing/server/starter-i18n.ts` 与
 * `site-member/server/member-preset-i18n.ts` 各抄了一份。
 */
export function resolveLocaleMessage(
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

/** locale → 嵌套文案树（与各模块 `client/locales/<locale>.json` 同形）。 */
export type LocaleCatalogMessages = Record<string, Record<string, unknown>>;

/**
 * 贡献方把本模块 locale JSON 挂到这里，marketing 建页 / 重设版式时才能解开
 * `site-member:login.title` 这种跨 ns 的预设 key。客户端走 i18next，不读这份表。
 *
 * 与 `registerPageTemplateKind` 同向：业务模块填进来，marketing 不反向 import。
 */
const CATALOGS = new Map<string, LocaleCatalogMessages>();

/** `ns:dot.key` —— 与 i18next 的 nsSeparator / check:i18n 字面量规则对齐。 */
const NAMESPACED_KEY =
  /^([a-z][a-z0-9-]*):([A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*)*)$/;

export function registerLocaleCatalog(
  ns: string,
  messages: LocaleCatalogMessages,
): void {
  CATALOGS.set(ns, messages);
}

export function parseNamespacedLocaleKey(
  raw: string,
): { ns: string; key: string } | null {
  const match = NAMESPACED_KEY.exec(raw);
  if (!match) return null;
  return { ns: match[1]!, key: match[2]! };
}

/**
 * 按已登记的 catalog 翻译 `ns:key`。不是这种形式、或 ns / key 对不上，返回
 * `undefined`（调用方再走自己的默认 ns 或把原文留下）。
 */
export function translateRegisteredKey(
  locale: AppLocale,
  raw: string,
): string | undefined {
  const parsed = parseNamespacedLocaleKey(raw);
  if (!parsed) return undefined;
  const catalog = CATALOGS.get(parsed.ns);
  if (!catalog) return undefined;
  const normalized = normalizeLocale(locale);
  const primary = catalog[normalized] ?? catalog[DEFAULT_LOCALE];
  const fallback = catalog[DEFAULT_LOCALE];
  if (!primary) return undefined;
  return (
    resolveLocaleMessage(primary, parsed.key) ??
    (fallback && fallback !== primary
      ? resolveLocaleMessage(fallback, parsed.key)
      : undefined)
  );
}
