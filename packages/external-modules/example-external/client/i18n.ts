import type { ClientI18nBundle } from "@be-water/module-sdk/client";

import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";

export const EXAMPLE_EXTERNAL_I18N: ClientI18nBundle = {
  ns: "example-external",
  resources: {
    "zh-CN": zhCN,
    en,
  },
};
