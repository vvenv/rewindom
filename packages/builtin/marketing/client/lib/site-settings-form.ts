import { readLocalizedSetting } from "../../shared/section-schema.js";

import type { SiteLocalizedText } from "../../shared/site-cms.js";
import type { AppLocale } from "@be-water/shared";

/**
 * 同一段文案的两种存储形态（纯字符串 / `__i18n`）表达的可能是同一份内容，
 * 逐语言读出来比就不会把「形状变了但字没变」误判成改动。
 */
export function sameLocalizedText(
  a: SiteLocalizedText,
  b: SiteLocalizedText,
  locales: AppLocale[],
  defaultLocale: AppLocale,
): boolean {
  return locales.every(
    (locale) =>
      readLocalizedSetting(a, locale, defaultLocale) ===
      readLocalizedSetting(b, locale, defaultLocale),
  );
}

/**
 * 把纯字符串文案钉死在指定语言名下。
 *
 * 纯字符串存的是「**当时的**主语言那一份文案」——语言是隐含的。所以换主语言前必须
 * 先钉一次：不然把主语言从中文改成 English，那串中文数据一个字节没动，含义却原地
 * 变成了英文站名。钉完再改，原文留在原语言下，新主语言是空的、要另填，这才是用户
 * 真正在做的那个决定。
 */
export function pinToLocale(
  value: SiteLocalizedText,
  locale: AppLocale,
): SiteLocalizedText {
  if (typeof value !== "string" || value === "") return value;
  return { __i18n: { [locale]: value } };
}

/** 主语言的站名是所有语言的兜底，空了整站没名字——它不随「正在编辑哪种译文」变。 */
export function primaryText(
  value: SiteLocalizedText,
  defaultLocale: AppLocale,
): string {
  return readLocalizedSetting(value, defaultLocale, defaultLocale).trim();
}
