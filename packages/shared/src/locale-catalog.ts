import {
  APP_LOCALES,
  DEFAULT_LOCALE,
  normalizeLocale,
  type AppLocale,
} from "./locale.js";

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
 * 贡献方把本模块 locale JSON 挂到这里，marketing 建页 / 重设版式、以及 section
 * schema 把 `ns:key` 默认值展开成 `__i18n` 表时才能解开。客户端 UI 走 i18next，
 * 不读这份表；但编辑器 `createBlock` 也走同一份 catalog，所以 client `i18n.ts`
 * 同样要 `registerLocaleCatalog`。
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

/**
 * 把 `ns:key` 展开成各语言原文表，给 CMS 段的可本地化默认值用。
 *
 * 某语言 JSON 里没有的槽位不写——缺的语言不要用另一句去填，否则中文站会把
 * 英文当「已翻译」。catalog 未登记或 key 对不上时返回 `undefined`，调用方
 * 再把原文当字面量。
 */
export function translateRegisteredKeyTable(
  raw: string,
): Record<string, string> | undefined {
  const parsed = parseNamespacedLocaleKey(raw);
  if (!parsed) return undefined;
  const catalog = CATALOGS.get(parsed.ns);
  if (!catalog) return undefined;
  const table: Record<string, string> = {};
  for (const { slug } of APP_LOCALES) {
    const messages = catalog[slug];
    if (!messages) continue;
    const text = resolveLocaleMessage(messages, parsed.key);
    if (typeof text === "string" && text !== "") table[slug] = text;
  }
  return Object.keys(table).length > 0 ? table : undefined;
}
