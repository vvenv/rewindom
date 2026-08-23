import { MAILER_ENTITLEMENT } from "../shared/index.js";

import { MAILER_I18N } from "./i18n.js";
import { MAILER_NAV_SECTIONS } from "./tenant/nav-sections.js";
import { renderMailerRoutes } from "./tenant/routes.js";

import type { ClientAppModule } from "@rewindom/client-kit";

export const mailerClientModule: ClientAppModule = {
  id: "mailer",
  version: "1.0.0",
  label: "Mailer",
  kind: "infrastructure",
  description: "发信通道配置与投递记录",
  tenantEntitlements: [MAILER_ENTITLEMENT],
  client: {
    i18n: MAILER_I18N,
    renderRoutes: renderMailerRoutes,
    nav: MAILER_NAV_SECTIONS,
  },
};
