import { registerLocaleCatalog } from "@rewindom/shared";

import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";

import type { ClientI18nBundle } from "@rewindom/client-kit";

const resources = {
  "zh-CN": zhCN,
  en,
};

registerLocaleCatalog("billing", resources);

export const BILLING_I18N: ClientI18nBundle = {
  ns: "billing",
  resources,
};
