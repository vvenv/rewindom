import { PLATFORM_I18N } from "./i18n.js";
import { platformNavContributions } from "./platform/nav-contributions.js";
import { renderPlatformRoutes } from "./platform/routes.js";
import { usePlatformImpersonationActive } from "./shell/platform-shell-slots.js";
import { PlatformTenantFilterProvider } from "./shell/tenant-filter-provider.js";
import { PLATFORM_TENANT_NAV_SECTIONS } from "./tenant/nav-sections.js";
import { renderPlatformTenantRoutes } from "./tenant/routes.js";

import type { ClientAppModule } from "@be-water/client-kit";

export const platformClientModule: ClientAppModule = {
  id: "platform",
  version: "1.0.0",
  label: "Platform Admin",
  kind: "infrastructure",
  description: "平台管理端页面、组件与 hooks",
  client: {
    i18n: PLATFORM_I18N,
    renderRoutes: renderPlatformTenantRoutes,
    nav: PLATFORM_TENANT_NAV_SECTIONS,
    renderPlatformRoutes,
    platformNav: platformNavContributions,
    shell: {
      useImpersonationActive: usePlatformImpersonationActive,
      shellProviders: [PlatformTenantFilterProvider],
    },
  },
};
