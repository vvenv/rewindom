import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";

import type { ClientI18nBundle } from "@rewindom/module-sdk/client";

export const SITE_DOCS_I18N: ClientI18nBundle = {
  ns: "site-docs",
  resources: {
    "zh-CN": zhCN,
    en,
  },
};
