
import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";

import type { ClientI18nBundle } from "@be-water/client-kit";

export const RBAC_I18N: ClientI18nBundle = {
  ns: "rbac",
  resources: {
    "zh-CN": zhCN,
    en,
  },
};
