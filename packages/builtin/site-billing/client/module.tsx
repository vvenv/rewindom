import { registerSiteSectionView } from "../../marketing/client/components/sections/section-views.js";
import { memberBillingAccountSection } from "../shared/account-section.js";
import { registerSiteBillingPageTemplates } from "../shared/member-billing-templates.js";
import { registerSiteBillingMemberMenuLink } from "../shared/member-menu-link.js";
import { memberPlansSection } from "../shared/plans-section.js";
import { SITE_BILLING_CSS } from "../shared/site-css.generated.js";

import { MemberBillingAccountSection } from "./components/sections/MemberBillingAccountSection.js";
import { MemberPlansSection } from "./components/sections/MemberPlansSection.js";
import { SITE_BILLING_I18N } from "./i18n.js";
import { SITE_BILLING_NAV_SECTIONS } from "./tenant/nav-sections.js";
import { renderSiteBillingRoutes } from "./tenant/routes.js";

import type { ClientAppModule } from "@rewindom/client-kit";

/*
 * 两个段与一张模板页：定义在 shared（与服务端 import 同一份），视图与模板元数据
 * 填进 marketing 的注册表。在模块文件顶层注册——manifest 被 import 就等于这个模块
 * 装进了这次构建。
 */
registerSiteSectionView(memberPlansSection, MemberPlansSection, {
  css: SITE_BILLING_CSS,
});
registerSiteSectionView(memberBillingAccountSection, MemberBillingAccountSection, {
  css: SITE_BILLING_CSS,
});
registerSiteBillingPageTemplates();
registerSiteBillingMemberMenuLink();

export const siteBillingClientModule: ClientAppModule = {
  id: "site-billing",
  version: "1.0.0",
  label: "Site billing",
  kind: "business",
  description: "站点会员的订阅套餐、结账与付款记录",
  client: {
    i18n: SITE_BILLING_I18N,
    renderRoutes: renderSiteBillingRoutes,
    nav: SITE_BILLING_NAV_SECTIONS,
  },
};
