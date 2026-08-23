import { Mail } from "lucide-react";

import {
  htmlChromeBlockView,
  htmlSectionView,
} from "@rewindom/builtin/marketing/client/components/sections/html-section-view.js";
import { registerChromeBlockView } from "@rewindom/builtin/marketing/client/components/sections/chrome-views.js";
import { registerSiteSectionView } from "@rewindom/builtin/marketing/client/components/sections/section-views.js";

import { NEWSLETTER_ENTITLEMENT } from "../shared/index.js";
import { registerNewsletterPageTemplates } from "../shared/newsletter-page-templates.js";
import { newsletterConfirmSection } from "../shared/sections/confirm/definition.js";
import { renderNewsletterConfirmHtml } from "../shared/sections/confirm/html.js";
import { newsletterSubscribeBlock } from "../shared/sections/subscribe-link/definition.js";
import { renderNewsletterSubscribeBlockHtml } from "../shared/sections/subscribe-link/html.js";
import { newsletterSubscribeSection } from "../shared/sections/subscribe/definition.js";
import { renderNewsletterSubscribeHtml } from "../shared/sections/subscribe/html.js";
import { newsletterUnsubscribeSection } from "../shared/sections/unsubscribe/definition.js";
import { renderNewsletterUnsubscribeHtml } from "../shared/sections/unsubscribe/html.js";
import { NEWSLETTER_CSS } from "../shared/site-css.generated.js";

import { registerNewsletterEditorContext } from "./editor-context.js";
import { NEWSLETTER_I18N } from "./i18n.js";
import { NEWSLETTER_NAV_SECTIONS } from "./tenant/nav-sections.js";
import { renderNewsletterRoutes } from "./tenant/routes.js";

import type { ClientAppModule } from "@rewindom/module-sdk/client";

/*
 * 编辑器预览灌**同一个 HTML 渲染器**：公开站是 SSR HTML，预览再写一套 JSX
 * 只会让两边慢慢漂。编辑器里 `HtmlFragment` 已经把 submit 拦掉了，
 * 预览里的表单点不出提交。
 *
 * 这几行是模块第一版漏掉的那一半——只登记了 server 侧的 `registerSiteSectionHtml`，
 * 结果段能渲染但租户在「添加区块」里根本找不到它，整个订阅功能没法启用。
 */
registerSiteSectionView(
  newsletterSubscribeSection,
  htmlSectionView(renderNewsletterSubscribeHtml),
  { css: NEWSLETTER_CSS, icon: Mail },
);
registerSiteSectionView(
  newsletterConfirmSection,
  htmlSectionView(renderNewsletterConfirmHtml),
  { css: NEWSLETTER_CSS, icon: Mail },
);
registerSiteSectionView(
  newsletterUnsubscribeSection,
  htmlSectionView(renderNewsletterUnsubscribeHtml),
  { css: NEWSLETTER_CSS, icon: Mail },
);
registerChromeBlockView(
  newsletterSubscribeBlock,
  htmlChromeBlockView(renderNewsletterSubscribeBlockHtml),
  { css: NEWSLETTER_CSS, icon: Mail },
);

// 模板页元数据两端各登记一次（幂等）：中台要列出这两行，写路径要按 kind 校验 slug
registerNewsletterPageTemplates();
// 订阅段的列表下拉：候选随站点变，走运行时选项源
registerNewsletterEditorContext();

export const newsletterClientModule: ClientAppModule = {
  id: "newsletter",
  version: "1.0.0",
  label: "Newsletter",
  kind: "business",
  description: "访客邮件订阅名单与摘要投递记录",
  requires: ["marketing"],
  tenantEntitlements: [NEWSLETTER_ENTITLEMENT],
  client: {
    i18n: NEWSLETTER_I18N,
    renderRoutes: renderNewsletterRoutes,
    nav: NEWSLETTER_NAV_SECTIONS,
  },
};
