
import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";

import type { ClientI18nBundle } from "@rewindom/client-kit";

export const DASHBOARD_I18N: ClientI18nBundle = {
  ns: "dashboard",
  resources: {
    "zh-CN": zhCN,
    en,
  },
};
