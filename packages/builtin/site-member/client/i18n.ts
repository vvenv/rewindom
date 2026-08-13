import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";

import type { ClientI18nBundle } from "@rewindom/client-kit";

export const SITE_MEMBER_I18N: ClientI18nBundle = {
  ns: "site-member",
  resources: {
    "zh-CN": zhCN,
    en,
  },
};
