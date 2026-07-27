import { renderPlatformRoutes } from "./PlatformRoutes.js";
import { usePlatformImpersonationActive } from "./shell/platform-shell-slots.js";
import { PlatformTenantFilterProvider } from "./shell/tenant-filter-provider.js";

import type { ClientAppModule } from "@be-water/client-kit";

export const platformClientModule: ClientAppModule = {
  id: "platform",
  version: "1.0.0",
  label: "Platform Admin",
  kind: "infrastructure",
  description: "平台管理端页面、组件与 hooks",
  client: {
    renderPlatformRoutes,
    shell: {
      useImpersonationActive: usePlatformImpersonationActive,
      shellProviders: [PlatformTenantFilterProvider],
    },
  },
};
