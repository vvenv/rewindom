import { LayoutGrid, Quote } from "lucide-react";

import { htmlSectionView } from "@rewindom/builtin/marketing/client/components/sections/html-section-view.js";
import { registerSiteSectionView } from "@rewindom/builtin/marketing/client/components/sections/section-views.js";

import { THING_ENTITLEMENT } from "../shared/index.js";
import { registerUselessPageTemplates } from "../shared/useless-page-templates.js";
import { uselessListSection } from "../shared/sections/list/definition.js";
import { renderUselessListHtml } from "../shared/sections/list/html.js";
import { uselessThingSection } from "../shared/sections/thing/definition.js";
import { renderUselessThingHtml } from "../shared/sections/thing/html.js";
import { USELESS_CSS } from "../shared/site-css.generated.js";

import { registerUselessEditorContext } from "./editor-context.js";
import { USELESS_I18N } from "./i18n.js";
import { THING_NAV_SECTIONS } from "./tenant/nav-sections.js";
import { renderThingsRoutes } from "./tenant/routes.js";

import type { ClientAppModule } from "@rewindom/module-sdk/client";

registerUselessPageTemplates();

registerSiteSectionView(
  uselessListSection,
  htmlSectionView(renderUselessListHtml),
  { css: USELESS_CSS, icon: LayoutGrid },
);
registerSiteSectionView(
  uselessThingSection,
  htmlSectionView(renderUselessThingHtml),
  { css: USELESS_CSS, icon: Quote },
);

registerUselessEditorContext();

export const uselessClientModule: ClientAppModule = {
  id: "useless",
  version: "1.0.0",
  label: "Useless",
  kind: "business",
  description: "无用之物——一件一件，没有用",
  tenantEntitlements: [THING_ENTITLEMENT],
  client: {
    i18n: USELESS_I18N,
    renderRoutes: renderThingsRoutes,
    nav: THING_NAV_SECTIONS,
  },
};
