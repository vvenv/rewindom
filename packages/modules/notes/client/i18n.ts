
import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";

import type { ClientI18nBundle } from "@be-water/client-kit";

export const NOTES_I18N: ClientI18nBundle = {
  ns: "notes",
  resources: {
    "zh-CN": zhCN,
    en,
  },
};
