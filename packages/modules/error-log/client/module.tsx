import { getI18n } from "@be-water/client-kit";

import { renderErrorLogPlatformRoutes } from "./ErrorLogRoutes.js";
import { errorLogPlatformNavContributions } from "./platform/nav-contributions.js";
import { ERROR_LOG_NAV_SECTIONS } from "./tenant/nav-sections.js";
import { renderErrorLogTenantRoutes } from "./tenant/routes.js";

import type { ClientAppModule } from "@be-water/client-kit";

export const errorLogClientModule: ClientAppModule = {
  id: "error-log",
  version: "1.0.0",
  label: "Error Logs",
  kind: "infrastructure",
  description: getI18n().t("description", { ns: "error-log" }),
  client: {
    renderRoutes: renderErrorLogTenantRoutes,
    nav: ERROR_LOG_NAV_SECTIONS,
    renderPlatformRoutes: renderErrorLogPlatformRoutes,
    platformNav: errorLogPlatformNavContributions,
  },
};
