import { registerLocaleCatalog } from "@rewindom/module-sdk";
import type { ClientI18nBundle } from "@rewindom/module-sdk/client";

import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";

const resources = {
  "zh-CN": zhCN,
  en,
};

registerLocaleCatalog("site-docs", resources);

export const SITE_DOCS_I18N: ClientI18nBundle = {
  ns: "site-docs",
  resources,
};
