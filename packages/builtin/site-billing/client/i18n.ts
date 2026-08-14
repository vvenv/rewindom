import { registerLocaleCatalog } from "@rewindom/shared";

import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";

import type { ClientI18nBundle } from "@rewindom/client-kit";

const resources = {
  "zh-CN": zhCN,
  en,
};

registerLocaleCatalog("site-billing", resources);

export const SITE_BILLING_I18N: ClientI18nBundle = {
  ns: "site-billing",
  resources,
};
