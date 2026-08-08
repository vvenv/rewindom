import type { ClientAppModule } from "@be-water/module-sdk/client";

import { BOOKMARK_ENTITLEMENT } from "../shared/entitlements.js";

import { BOOKMARK_I18N } from "./i18n.js";
import { BOOKMARK_NAV_SECTIONS } from "./nav-sections.js";
import { renderBookmarkRoutes } from "./routes.js";

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
    mobileTabPaths: ["/app/bookmarks"],
  },
};
