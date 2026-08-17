import { TextCursorInput } from "lucide-react";

import { htmlSectionView } from "@rewindom/builtin/marketing/client/components/sections/html-section-view.js";
import { registerSiteSectionView } from "@rewindom/builtin/marketing/client/components/sections/section-views.js";
import { registerBlockIcon } from "@rewindom/builtin/marketing/client/components/theme-editor/section-icons.js";

import { SITE_FORM_ENTITLEMENT } from "../shared/entitlements.js";
import { formSection } from "../shared/sections/form/definition.js";
import { renderFormHtml } from "../shared/sections/form/html.js";
import { FORM_CSS } from "../shared/site-css.generated.js";

import { SITE_FORM_I18N } from "./i18n.js";
import { SITE_FORM_NAV_SECTIONS } from "./tenant/nav-sections.js";
import { renderSiteFormRoutes } from "./tenant/routes.js";

import type { ClientAppModule } from "@rewindom/module-sdk/client";

/*
 * 预览走 `htmlSectionView`：公开站是 SSR HTML，预览再写一套 JSX 只会让两边慢慢漂。
 * 编辑器里 `HtmlFragment` 已经把 submit 拦掉了，所以预览里的表单点不出提交。
 */
registerSiteSectionView(formSection, htmlSectionView(renderFormHtml), {
  css: FORM_CSS,
  icon: TextCursorInput,
});
registerBlockIcon("field", TextCursorInput);

export const siteFormClientModule: ClientAppModule = {
  id: "site-form",
  version: "1.0.0",
  label: "Site forms",
  kind: "business",
  description: "官网表单段与提交记录",
  requires: ["marketing"],
  tenantEntitlements: [SITE_FORM_ENTITLEMENT],
  client: {
    i18n: SITE_FORM_I18N,
    renderRoutes: renderSiteFormRoutes,
    nav: SITE_FORM_NAV_SECTIONS,
  },
};
