/**
 * 服务端解析本模块预设里的 i18n key（`site-docs:template.index.title`）。
 *
 * 登记进 locale catalog，marketing 的 `createStarterTranslator` 就能解开
 * 带命名空间的 key（建租户快照 / 重设版式 / SSR 兜底）。
 */

import { registerLocaleCatalog } from "@rewindom/module-sdk/server";

import en from "../client/locales/en.json" with { type: "json" };
import zhCN from "../client/locales/zh-CN.json" with { type: "json" };

const MESSAGES: Record<string, Record<string, unknown>> = {
  "zh-CN": zhCN as Record<string, unknown>,
  en: en as Record<string, unknown>,
};

registerLocaleCatalog("site-docs", MESSAGES);
