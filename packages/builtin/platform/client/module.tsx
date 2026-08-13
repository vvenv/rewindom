import { PLATFORM_I18N } from "./i18n.js";
import { platformNavContributions } from "./platform/nav-contributions.js";
import { renderPlatformRoutes } from "./platform/routes.js";
import { usePlatformImpersonationActive } from "./shell/platform-shell-slots.js";
import { PlatformTenantFilterProvider } from "./shell/tenant-filter-provider.js";

import type { ClientAppModule } from "@rewindom/client-kit";

export const platformClientModule: ClientAppModule = {
  id: "platform",
  version: "1.0.0",
  label: "Platform Admin",
  kind: "infrastructure",
  description: "平台管理端页面、组件与 hooks",
  client: {
    i18n: PLATFORM_I18N,
    // 租户侧没有页面了：品牌并进站点外观，第三方登录并进会员页
    renderPlatformRoutes,
    platformNav: platformNavContributions,
    shell: {
      useImpersonationActive: usePlatformImpersonationActive,
      shellProviders: [PlatformTenantFilterProvider],
    },
  },
};
