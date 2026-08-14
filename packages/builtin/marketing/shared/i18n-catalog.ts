/**
 * 把 marketing 自己的 locale JSON 挂到 catalog，供 section schema 把
 * `marketing:storefront.*` 默认值展开成 `__i18n` 表。
 *
 * 与 shop / site-member 的 preset-i18n 同向：文案只活在 `client/locales/*.json`。
 */

import { registerLocaleCatalog } from "@rewindom/shared";

import en from "../client/locales/en.json" with { type: "json" };
import zhCN from "../client/locales/zh-CN.json" with { type: "json" };

export const MARKETING_LOCALE_MESSAGES: Record<
  string,
  Record<string, unknown>
> = {
  "zh-CN": zhCN as Record<string, unknown>,
  en: en as Record<string, unknown>,
};

registerLocaleCatalog("marketing", MARKETING_LOCALE_MESSAGES);
