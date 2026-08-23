import { NEWSLETTER_ENTITLEMENT } from "../shared/index.js";

import { NEWSLETTER_I18N } from "./i18n.js";
import { NEWSLETTER_NAV_SECTIONS } from "./tenant/nav-sections.js";
import { renderNewsletterRoutes } from "./tenant/routes.js";

import type { ClientAppModule } from "@rewindom/module-sdk/client";

export const newsletterClientModule: ClientAppModule = {
  id: "newsletter",
  version: "1.0.0",
  label: "Newsletter",
  kind: "business",
  description: "访客邮件订阅名单与摘要投递记录",
  tenantEntitlements: [NEWSLETTER_ENTITLEMENT],
  client: {
    i18n: NEWSLETTER_I18N,
    renderRoutes: renderNewsletterRoutes,
    nav: NEWSLETTER_NAV_SECTIONS,
  },
};
