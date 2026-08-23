/**
 * 往「站点」的注册表里填本模块的贡献（SSR 侧）。
 *
 * 定义与 HTML 渲染器都住在本模块 `shared/`，两端 import 同一份——marketing 只提供
 * 注册表，不认识 `newsletter.*` 这些 type。与 site-form / shop 同构。
 *
 * **每一项在 client manifest 那边还要再登记一次**（编辑器视图 / 模板页元数据）。
 * 只登记这一边的后果是：段能渲染，但租户在 Theme Editor 里找不到它——
 * 交付第一版时正是漏了那一半。
 */
import { newsletterSubscribeSection } from "../shared/sections/subscribe/definition.js";
import { renderNewsletterSubscribeHtml } from "../shared/sections/subscribe/html.js";
import { newsletterSubscribeBlock } from "../shared/sections/subscribe-link/definition.js";
import { renderNewsletterSubscribeBlockHtml } from "../shared/sections/subscribe-link/html.js";
import { newsletterConfirmSection } from "../shared/sections/confirm/definition.js";
import { renderNewsletterConfirmHtml } from "../shared/sections/confirm/html.js";
import { newsletterUnsubscribeSection } from "../shared/sections/unsubscribe/definition.js";
import { renderNewsletterUnsubscribeHtml } from "../shared/sections/unsubscribe/html.js";
import { registerNewsletterPageTemplates } from "../shared/newsletter-page-templates.js";
import { NEWSLETTER_CSS } from "../shared/site-css.generated.js";

import { registerChromeBlockHtml } from "@rewindom/builtin/marketing/shared/sections/_common/chrome-html.js";
import { registerSiteSectionHtml } from "@rewindom/builtin/marketing/shared/sections/html.js";

/** 在模块 `onBoot` 里调。 */
export function registerNewsletterSiteContributions(): void {
  const css = { css: NEWSLETTER_CSS };

  registerSiteSectionHtml(
    newsletterSubscribeSection,
    renderNewsletterSubscribeHtml,
    css,
  );
  registerSiteSectionHtml(
    newsletterConfirmSection,
    renderNewsletterConfirmHtml,
    css,
  );
  registerSiteSectionHtml(
    newsletterUnsubscribeSection,
    renderNewsletterUnsubscribeHtml,
    css,
  );

  registerChromeBlockHtml(
    newsletterSubscribeBlock,
    renderNewsletterSubscribeBlockHtml,
    css,
  );

  registerNewsletterPageTemplates();
}
