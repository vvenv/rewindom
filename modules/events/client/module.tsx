import { Radar, Rss, TrendingUp } from "lucide-react";

import { htmlSectionView } from "@rewindom/builtin/marketing/client/components/sections/html-section-view.js";
import { registerSiteSectionView } from "@rewindom/builtin/marketing/client/components/sections/section-views.js";

import { EVENTS_I18N } from "./i18n.js";
import { registerEventsEditorContext } from "./editor-context.js";
import { EVENTS_DASHBOARD_WIDGETS } from "./tenant/dashboard-widgets.js";
import { EVENTS_NAV_SECTIONS } from "./tenant/nav-sections.js";
import { renderEventsRoutes } from "./tenant/routes.js";

import {
  EVENTS_ENTITLEMENT,
  eventsDetailSection,
  eventsFeedSection,
  eventsNowSection,
  eventsRisingSection,
} from "../shared/index.js";
import { registerEventsPageTemplates } from "../shared/events-page-templates.js";
import { registerEventsNavSources } from "../shared/nav-sources.js";
import { renderEventsDetailHtml } from "../shared/sections/detail-html.js";
import { renderEventsFeedHtml } from "../shared/sections/feed-html.js";
import { EVENTS_CSS } from "../shared/site-css.generated.js";

import type { ClientAppModule } from "@rewindom/module-sdk/client";

/*
 * 官网贡献的客户端一半：编辑器要能在「添加区块」里看到升温 / 正在发生两段，并用
 * **同一份** HTML 渲染器预览（`htmlSectionView`），不再为编辑器写一套 React 版式。
 */
registerEventsPageTemplates();
registerEventsNavSources();
registerEventsEditorContext();
registerSiteSectionView(
  eventsRisingSection,
  htmlSectionView(renderEventsFeedHtml),
  { css: EVENTS_CSS, icon: TrendingUp },
);
registerSiteSectionView(eventsNowSection, htmlSectionView(renderEventsFeedHtml), {
  css: EVENTS_CSS,
  icon: Rss,
});
registerSiteSectionView(
  eventsFeedSection,
  htmlSectionView(renderEventsFeedHtml),
  { css: EVENTS_CSS, icon: Rss },
);
registerSiteSectionView(
  eventsDetailSection,
  htmlSectionView(renderEventsDetailHtml),
  { css: EVENTS_CSS, icon: Radar },
);

export const eventsClientModule: ClientAppModule = {
  id: "events",
  version: "1.0.0",
  label: "Events",
  kind: "business",
  description: "跨来源发现事件、重建时间线并持续追踪",
  tenantEntitlements: [EVENTS_ENTITLEMENT],
  client: {
    i18n: EVENTS_I18N,
    renderRoutes: renderEventsRoutes,
    nav: EVENTS_NAV_SECTIONS,
    dashboardWidgets: EVENTS_DASHBOARD_WIDGETS,
    // 底部 tab 只放高频业务入口，全站不超过 5 个（见 create-module skill）
    mobileTabPaths: ["/app/events"],
  },
};
