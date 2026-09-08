import { IP_ACCESS_ENTITLEMENT } from "../shared/index.js";

import { IP_ACCESS_I18N } from "./i18n.js";
import { IP_ACCESS_PLATFORM_DASHBOARD_SECTIONS } from "./platform/dashboard-sections.js";
import { ipAccessPlatformNavContributions } from "./platform/nav-contributions.js";
import { renderIpAccessPlatformRoutes } from "./platform/routes.js";
import { IP_ACCESS_NAV_SECTIONS } from "./tenant/nav-sections.js";
import { renderIpAccessRoutes } from "./tenant/routes.js";

import type { ClientAppModule } from "@rewindom/client-kit";

export const ipAccessClientModule: ClientAppModule = {
  id: "ip-access",
  version: "1.0.0",
  label: "IP Access",
  kind: "infrastructure",
  description: "站点访问名单与平台全局 IP 封禁",
  tenantEntitlements: [IP_ACCESS_ENTITLEMENT],
  client: {
    i18n: IP_ACCESS_I18N,
    renderRoutes: renderIpAccessRoutes,
    nav: IP_ACCESS_NAV_SECTIONS,
    renderPlatformRoutes: renderIpAccessPlatformRoutes,
    platformNav: ipAccessPlatformNavContributions,
    platformDashboardSections: IP_ACCESS_PLATFORM_DASHBOARD_SECTIONS,
  },
};
