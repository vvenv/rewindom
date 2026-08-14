/**
 * 把本模块 locale JSON 挂到 catalog，供 section schema 把 `billing:storefront.*`
 * 默认值展开成 `__i18n` 表。与 site-member / shop 的 preset-i18n 同向。
 */

import { registerLocaleCatalog } from "@rewindom/shared";

import en from "../client/locales/en.json" with { type: "json" };
import zhCN from "../client/locales/zh-CN.json" with { type: "json" };

registerLocaleCatalog("billing", {
  "zh-CN": zhCN as Record<string, unknown>,
  en: en as Record<string, unknown>,
});
