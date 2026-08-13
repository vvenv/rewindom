
import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";

import type { ClientI18nBundle } from "@rewindom/client-kit";

export const SLOW_QUERY_I18N: ClientI18nBundle = {
  ns: "slow-query",
  resources: {
    "zh-CN": zhCN,
    en,
  },
};
