import { registerLocaleCatalog } from "@rewindom/module-sdk";
import type { ClientI18nBundle } from "@rewindom/module-sdk/client";

import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";

const resources = {
  "zh-CN": zhCN,
  en,
};

/*
 * 编辑器侧解 `events:site.hero.headline` 这类跨 ns key —— 段 schema 的
 * `default` 靠 `translateRegisteredKeyTable` 展成 `__i18n` 表，`createSection`
 * 才有文案可填。服务端已在 `server/ssr/events-preset-i18n.ts` 登记过同一份；
 * 客户端漏登记时新加的段会带着 key 原文进草稿（预览显示 `events:...`、
 * 设置项是空的），直到保存后由服务端解析补回来。
 */
registerLocaleCatalog("events", resources);

export const EVENTS_I18N: ClientI18nBundle = {
  ns: "events",
  resources,
};
