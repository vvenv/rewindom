/**
 * 站点 locale（`APP_LOCALES` 的 slug）→ 各引擎认的语言码。
 *
 * 三家的口径都不一样：浏览器内置 API 收 BCP 47 且中文要写 `zh-Hans`，
 * LibreTranslate 只收两字母 `zh`，MyMemory 要 `zh-CN`。不做映射的表现是
 * 「点了没反应」——引擎认不出语言码时多半静默回原文，最难查。
 */

/** Chrome `Translator` API：中文必须带 script subtag，否则 availability 恒为 unavailable。 */
export function toBrowserCode(locale: string): string {
  if (locale === "zh-CN") return "zh-Hans";
  if (locale === "zh-TW" || locale === "zh-HK") return "zh-Hant";
  return locale;
}

/** LibreTranslate：只认两字母主码。 */
export function toLibreCode(locale: string): string {
  return locale.split("-")[0]?.toLowerCase() || locale;
}

/** MyMemory：`langpair` 用 RFC 3066，中文用 `zh-CN`。 */
export function toMyMemoryCode(locale: string): string {
  if (locale === "zh") return "zh-CN";
  return locale;
}
