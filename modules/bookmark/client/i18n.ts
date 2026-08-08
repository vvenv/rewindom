import type { ClientI18nBundle } from "@be-water/module-sdk/client";

import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";

export const BOOKMARK_I18N: ClientI18nBundle = {
  ns: "bookmark",
  resources: {
    "zh-CN": zhCN,
    en,
  },
};
