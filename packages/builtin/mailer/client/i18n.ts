import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";

import type { ClientI18nBundle } from "@rewindom/client-kit";

export const MAILER_I18N: ClientI18nBundle = {
  ns: "mailer",
  resources: {
    "zh-CN": zhCN,
    en,
  },
};
