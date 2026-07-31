import type { ClientI18nBundle } from "@be-water/client-kit";

import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";

export const BILLING_I18N: ClientI18nBundle = {
  ns: "billing",
  resources: {
    "zh-CN": zhCN,
    en,
  },
};
