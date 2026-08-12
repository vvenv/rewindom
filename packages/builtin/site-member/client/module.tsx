import { registerSiteSectionView } from "../../marketing/client/components/sections/section-views.js";
import { memberAccountPanelSection } from "../shared/member-account-section.js";
import {
  memberLoginFormSection,
  memberRegisterFormSection,
} from "../shared/member-auth-section.js";
import { memberGateSection } from "../shared/member-gate-section.js";
import { registerMemberPageTemplates } from "../shared/member-page-templates.js";
import {
  MEMBER_ACCOUNT_CSS,
  MEMBER_AUTH_CSS,
  MEMBER_GATE_CSS,
} from "../shared/site-css.generated.js";

import { MemberAccountPanelSection } from "./components/MemberAccountPanelSection.js";
import {
  MemberLoginFormSection,
  MemberRegisterFormSection,
} from "./components/MemberAuthFormSection.js";
import { MemberGateSection } from "./components/MemberGateSection.js";
import { SITE_MEMBER_I18N } from "./i18n.js";
import { renderSiteMemberPublicRoutes } from "./public/routes.js";
import { SiteMemberPublicProviders } from "./shell/SiteMemberPublicProviders.js";
import { SITE_MEMBER_DASHBOARD_WIDGETS } from "./tenant/dashboard-widgets.js";
import { SITE_MEMBER_NAV_SECTIONS } from "./tenant/nav-sections.js";
import { renderSiteMemberRoutes } from "./tenant/routes.js";

import type { ClientAppModule } from "@be-water/client-kit";

/*
 * 「会员专属内容」段：定义在 shared（与服务端 import 同一份），视图填进 marketing 的
 * 视图表。在模块文件顶层注册——manifest 被 import 就等于这个模块装进了这次构建。
 */
registerSiteSectionView(memberGateSection, MemberGateSection, {
  css: MEMBER_GATE_CSS,
});

/*
 * 会员那三张模板页（登录 / 注册 / 我的账户）与它们的必备段。
 *
 * 模板页元数据两端都要登记：中台要列出这几行，写路径要按 kind 校验 slug。
 */
registerMemberPageTemplates();
registerSiteSectionView(memberLoginFormSection, MemberLoginFormSection, {
  css: MEMBER_AUTH_CSS,
});
registerSiteSectionView(memberRegisterFormSection, MemberRegisterFormSection, {
  css: MEMBER_AUTH_CSS,
});
registerSiteSectionView(memberAccountPanelSection, MemberAccountPanelSection, {
  css: MEMBER_ACCOUNT_CSS,
});

export const siteMemberClientModule: ClientAppModule = {
  id: "site-member",
  version: "1.0.0",
  label: "Site members",
  kind: "infrastructure",
  description: "站点前台会员身份与运营侧会员管理",
  // marketing：会员入口 / 门控 slot 定义在消费方；本模块只填 Provider
  requires: ["marketing"],
  client: {
    i18n: SITE_MEMBER_I18N,
    renderPublicRoutes: renderSiteMemberPublicRoutes,
    renderRoutes: renderSiteMemberRoutes,
    nav: SITE_MEMBER_NAV_SECTIONS,
    dashboardWidgets: SITE_MEMBER_DASHBOARD_WIDGETS,
    shell: {
      publicProviders: [SiteMemberPublicProviders],
    },
  },
};
