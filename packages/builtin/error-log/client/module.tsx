import { renderErrorLogPlatformRoutes } from "./ErrorLogRoutes.js";
import { ERROR_LOG_I18N } from "./i18n.js";
import { errorLogPlatformNavContributions } from "./platform/nav-contributions.js";
import { ERROR_LOG_NAV_SECTIONS } from "./tenant/nav-sections.js";
import { renderErrorLogTenantRoutes } from "./tenant/routes.js";

import type { ClientAppModule } from "@be-water/client-kit";

export const errorLogClientModule: ClientAppModule = {
  id: "error-log",
  version: "1.0.0",
  label: "Error Logs",
  kind: "infrastructure",
  description: "平台与租户错误日志页面与 hooks",
  client: {
    i18n: ERROR_LOG_I18N,
    renderRoutes: renderErrorLogTenantRoutes,
    nav: ERROR_LOG_NAV_SECTIONS,
    renderPlatformRoutes: renderErrorLogPlatformRoutes,
    platformNav: errorLogPlatformNavContributions,
  },
};
