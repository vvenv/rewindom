import { registerLocaleCatalog } from "@rewindom/module-sdk";
import type { ClientI18nBundle } from "@rewindom/module-sdk/client";

import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";

const resources = {
  "zh-CN": zhCN,
  en,
};

registerLocaleCatalog("shop", resources);

export const SHOP_I18N: ClientI18nBundle = {
  ns: "shop",
  resources,
};
