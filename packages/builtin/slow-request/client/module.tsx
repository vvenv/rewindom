import { SLOW_REQUEST_I18N } from "./i18n.js";
import { SLOW_REQUEST_PLATFORM_DASHBOARD_SECTIONS } from "./platform/dashboard-sections.js";
import { slowRequestPlatformNavContributions } from "./platform/nav-contributions.js";
import { renderSlowRequestPlatformRoutes } from "./platform/routes.js";

import type { ClientAppModule } from "@rewindom/client-kit";

export const slowRequestClientModule: ClientAppModule = {
  id: "slow-request",
  version: "1.0.0",
  label: "Slow Request Logs",
  kind: "infrastructure",
  description: "平台慢请求日志页面",
  client: {
    i18n: SLOW_REQUEST_I18N,
    renderPlatformRoutes: renderSlowRequestPlatformRoutes,
    platformNav: slowRequestPlatformNavContributions,
    platformDashboardSections: SLOW_REQUEST_PLATFORM_DASHBOARD_SECTIONS,
  },
};
