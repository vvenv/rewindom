import { THING_ENTITLEMENT } from "../shared/index.js";

import { USELESS_I18N } from "./i18n.js";
import { THING_NAV_SECTIONS } from "./tenant/nav-sections.js";
import { renderThingsRoutes } from "./tenant/routes.js";

import type { ClientAppModule } from "@rewindom/module-sdk/client";

export const uselessClientModule: ClientAppModule = {
  id: "useless",
  version: "1.0.0",
  label: "Useless",
  kind: "business",
  description: "无用句子库——每天一条没有用的话",
  tenantEntitlements: [THING_ENTITLEMENT],
  client: {
    i18n: USELESS_I18N,
    renderRoutes: renderThingsRoutes,
    nav: THING_NAV_SECTIONS,
  },
};
