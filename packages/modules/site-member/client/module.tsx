import { TENANT_SITE_MEMBER_ENTITLEMENT } from "../shared/entitlements.js";

import { SITE_MEMBER_I18N } from "./i18n.js";
import { renderSiteMemberPublicRoutes } from "./public/routes.js";
import { SiteMemberPublicProviders } from "./shell/SiteMemberPublicProviders.js";
import { SITE_MEMBER_NAV_SECTIONS } from "./tenant/nav-sections.js";
import { renderSiteMemberRoutes } from "./tenant/routes.js";

import type { ClientAppModule } from "@be-water/client-kit";

export const siteMemberClientModule: ClientAppModule = {
  id: "site-member",
  version: "1.0.0",
  label: "Site members",
  kind: "infrastructure",
  description: "站点前台会员身份与运营侧会员管理",
  // marketing：会员入口 / 门控 slot 定义在消费方；本模块只填 Provider
  requires: ["marketing"],
  tenantEntitlements: [TENANT_SITE_MEMBER_ENTITLEMENT],
  client: {
    i18n: SITE_MEMBER_I18N,
    renderPublicRoutes: renderSiteMemberPublicRoutes,
    renderRoutes: renderSiteMemberRoutes,
    nav: SITE_MEMBER_NAV_SECTIONS,
    shell: {
      publicProviders: [SiteMemberPublicProviders],
    },
  },
};
