
import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";

import type { ClientI18nBundle } from "@rewindom/client-kit";

export const BACKGROUND_JOB_I18N: ClientI18nBundle = {
  ns: "background-job",
  resources: {
    "zh-CN": zhCN,
    en,
  },
};
