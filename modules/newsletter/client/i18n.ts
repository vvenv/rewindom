import { registerLocaleCatalog } from "@rewindom/module-sdk";

import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";

import type { ClientI18nBundle } from "@rewindom/module-sdk/client";

const resources = {
  "zh-CN": zhCN,
  en,
};

/*
 * 段预设与 setting `default` 里的库存文案（`newsletter:form.submit` 等）按这份表
 * 展开成 `{ __i18n }` 整表。
 *
 * **不调这一句的后果是编辑器里直接显示 key**：那些默认值以 `ns:key` 的形式写在
 * 段定义里，展开发生在建页 / 重设版式那一刻，找不到 catalog 就原样落库、原样渲染。
 * 贡献段的模块（site-form / site-docs / shop / events / site-member）都调了这一句，
 * 交付第一版时只有本模块漏了。
 */
registerLocaleCatalog("newsletter", resources);

export const NEWSLETTER_I18N: ClientI18nBundle = {
  ns: "newsletter",
  resources,
};
