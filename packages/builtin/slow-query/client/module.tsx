import { SLOW_QUERY_I18N } from "./i18n.js";
import { slowQueryPlatformNavContributions } from "./platform/nav-contributions.js";
import { renderSlowQueryPlatformRoutes } from "./platform/routes.js";

import type { ClientAppModule } from "@be-water/client-kit";

export const slowQueryClientModule: ClientAppModule = {
  id: "slow-query",
  version: "1.0.0",
  label: "Slow Query Logs",
  kind: "infrastructure",
  description: "平台慢查询日志页面",
  client: {
    i18n: SLOW_QUERY_I18N,
    renderPlatformRoutes: renderSlowQueryPlatformRoutes,
    platformNav: slowQueryPlatformNavContributions,
  },
};
