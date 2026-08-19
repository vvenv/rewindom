import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";

import type { ClientI18nBundle } from "@rewindom/client-kit";

export const TRANSLATION_I18N: ClientI18nBundle = {
  ns: "translation",
  resources: {
    "zh-CN": zhCN,
    en,
  },
};
