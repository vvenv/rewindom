
import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";

import type { ClientI18nBundle } from "@rewindom/client-kit";

export const IP_ACCESS_I18N: ClientI18nBundle = {
  ns: "ip-access",
  resources: {
    "zh-CN": zhCN,
    en,
  },
};
