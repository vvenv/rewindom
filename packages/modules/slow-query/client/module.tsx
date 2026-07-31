import { getI18n } from "@be-water/client-kit";

import { slowQueryPlatformNavContributions } from "./platform/nav-contributions.js";
import { renderSlowQueryPlatformRoutes } from "./SlowQueryRoutes.js";

import type { ClientAppModule } from "@be-water/client-kit";

export const slowQueryClientModule: ClientAppModule = {
  id: "slow-query",
  version: "1.0.0",
  label: "Slow Query Logs",
  kind: "infrastructure",
  description: getI18n().t("description", { ns: "slow-query" }),
  client: {
    renderPlatformRoutes: renderSlowQueryPlatformRoutes,
    platformNav: slowQueryPlatformNavContributions,
  },
};
