import { NOTES_ENTITLEMENT } from "../shared/index.js";

import { NOTES_NAV_SECTIONS } from "./tenant/nav-sections.js";
import { renderNotesRoutes } from "./tenant/routes.js";

import type { ClientAppModule } from "@be-water/client-kit";

export const notesClientModule: ClientAppModule = {
  id: "notes",
  version: "1.0.0",
  label: "Notes",
  kind: "business",
  description: "租户内笔记 CRUD 金标准示例模块",
  tenantEntitlements: [NOTES_ENTITLEMENT],
  client: {
    renderRoutes: renderNotesRoutes,
    nav: NOTES_NAV_SECTIONS,
  },
};
