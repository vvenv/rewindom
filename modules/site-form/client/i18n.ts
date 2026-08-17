import { registerLocaleCatalog } from "@rewindom/module-sdk";

import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";

import type { ClientI18nBundle } from "@rewindom/module-sdk/client";

const resources = {
  "zh-CN": zhCN,
  en,
};

// 段预设里的库存文案（`site-form:form.fieldName` 等）按这份表展开成 `{ __i18n }`
registerLocaleCatalog("site-form", resources);

export const SITE_FORM_I18N: ClientI18nBundle = {
  ns: "site-form",
  resources,
};
