import type { ClientI18nBundle } from "@be-water/client-kit";

import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";

export const SLOW_QUERY_I18N: ClientI18nBundle = {
  ns: "slow-query",
  resources: {
    "zh-CN": zhCN,
    en,
  },
};
