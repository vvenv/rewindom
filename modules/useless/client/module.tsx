import { Quote } from "lucide-react";

import { htmlSectionView } from "@rewindom/builtin/marketing/client/components/sections/html-section-view.js";
import { registerSiteSectionView } from "@rewindom/builtin/marketing/client/components/sections/section-views.js";

import { THING_ENTITLEMENT } from "../shared/index.js";
import { uselessTodaySection } from "../shared/sections/today/definition.js";
import { renderUselessTodayHtml } from "../shared/sections/today/html.js";
import { USELESS_CSS } from "../shared/site-css.generated.js";

import { registerUselessEditorContext } from "./editor-context.js";
import { USELESS_I18N } from "./i18n.js";
import { THING_NAV_SECTIONS } from "./tenant/nav-sections.js";
import { renderThingsRoutes } from "./tenant/routes.js";

import type { ClientAppModule } from "@rewindom/module-sdk/client";

/*
 * 段的另一半：server 侧 `registerSiteSectionHtml` 让它能渲染，这里让租户在
 * Theme Editor 的「添加区块」里找得到它。漏掉这半 = 功能等于没上。
 */
registerSiteSectionView(
  uselessTodaySection,
  htmlSectionView(renderUselessTodayHtml),
  { css: USELESS_CSS, icon: Quote },
);

/* 预览取数。只登记 SSR 那边预览会是空白。 */
registerUselessEditorContext();

export const uselessClientModule: ClientAppModule = {
  id: "useless",
  version: "1.0.0",
  label: "Useless",
  kind: "business",
  description: "无用句子库——每天一条没有用的话",
  tenantEntitlements: [THING_ENTITLEMENT],
  client: {
    i18n: USELESS_I18N,
    renderRoutes: renderThingsRoutes,
    nav: THING_NAV_SECTIONS,
  },
};
