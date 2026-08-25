import type { ClientI18nBundle } from "@rewindom/module-sdk/client";

import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";

export const CONTENT_I18N: ClientI18nBundle = {
  ns: "content",
  resources: {
    "zh-CN": zhCN,
    en,
  },
};
