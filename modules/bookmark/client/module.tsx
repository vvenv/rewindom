import type { ClientAppModule } from "@rewindom/module-sdk/client";

import { BOOKMARK_ENTITLEMENT } from "../shared/index.js";

import { BOOKMARK_I18N } from "./i18n.js";
import { BOOKMARK_DASHBOARD_WIDGETS } from "./tenant/dashboard-widgets.js";
import { BOOKMARK_NAV_SECTIONS } from "./tenant/nav-sections.js";
import { renderBookmarkRoutes } from "./tenant/routes.js";

export const bookmarkClientModule: ClientAppModule = {
  id: "bookmark",
  version: "1.0.0",
  label: "Bookmarks",
  kind: "business",
  description: "租户内书签管理",
  tenantEntitlements: [BOOKMARK_ENTITLEMENT],
  client: {
    i18n: BOOKMARK_I18N,
    renderRoutes: renderBookmarkRoutes,
    nav: BOOKMARK_NAV_SECTIONS,
    dashboardWidgets: BOOKMARK_DASHBOARD_WIDGETS,
    // 底部 tab 只放高频业务入口；管理类页面走抽屉导航（见 MODULE.md）
    mobileTabPaths: ["/app/bookmarks"],
  },
};
