import type { ClientI18nBundle } from "@rewindom/module-sdk/client";

import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";

export const NOTE_I18N: ClientI18nBundle = {
  ns: "note",
  resources: {
    "zh-CN": zhCN,
    en,
  },
};
