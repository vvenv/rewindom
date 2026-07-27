import { renderErrorLogPlatformRoutes } from "./ErrorLogRoutes.js";
import { errorLogPlatformNavContributions } from "./platform/nav-contributions.js";

import type { ClientAppModule } from "@be-water/client-kit";

export const errorLogClientModule: ClientAppModule = {
  id: "error-log",
  version: "1.0.0",
  label: "Error Logs",
  kind: "infrastructure",
  description: "平台错误日志页面与 hooks",
  client: {
    renderPlatformRoutes: renderErrorLogPlatformRoutes,
    platformNav: errorLogPlatformNavContributions,
  },
};
