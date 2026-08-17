import type { ClientI18nBundle } from "@rewindom/module-sdk/client";

import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";

export const EVENTS_I18N: ClientI18nBundle = {
  ns: "events",
  resources: {
    "zh-CN": zhCN,
    en,
  },
};
