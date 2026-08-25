import type { ClientAppModule } from "@rewindom/module-sdk/client";

import { CONTENT_ENTITLEMENT } from "../shared/index.js";

import { CONTENT_I18N } from "./i18n.js";
import { CONTENT_NAV_SECTIONS } from "./tenant/nav-sections.js";
import { renderContentsRoutes } from "./tenant/routes.js";

export const contentClientModule: ClientAppModule = {
  id: "content",
  version: "1.0.0",
  label: "Content",
  kind: "business",
  description: "用图片、视频和文字生成笔记与文章",
  tenantEntitlements: [CONTENT_ENTITLEMENT],
  client: {
    i18n: CONTENT_I18N,
    renderRoutes: renderContentsRoutes,
    nav: CONTENT_NAV_SECTIONS,
  },
};
