import type { ClientAppModule } from "@be-water/module-sdk/client";

import { EXAMPLE_EXTERNAL_ENTITLEMENT } from "../shared/entitlements.js";

import { EXAMPLE_EXTERNAL_I18N } from "./i18n.js";
import { EXAMPLE_EXTERNAL_NAV_SECTIONS } from "./nav-sections.js";
import { renderExampleExternalRoutes } from "./routes.js";

export const exampleExternalClientModule: ClientAppModule = {
  id: "example-external",
  version: "1.0.0",
  label: "External Bookmarks",
  kind: "business",
  description: "外部模块示例：租户内书签管理",
  tenantEntitlements: [EXAMPLE_EXTERNAL_ENTITLEMENT],
  client: {
    i18n: EXAMPLE_EXTERNAL_I18N,
    renderRoutes: renderExampleExternalRoutes,
    nav: EXAMPLE_EXTERNAL_NAV_SECTIONS,
    mobileTabPaths: ["/app/example-external"],
  },
};
