/**
 * 往「站点」的段注册表里填订阅段（SSR 侧）。
 *
 * 定义与 HTML 渲染器都住在本模块 `shared/`，两端 import 同一份——marketing 只提供
 * 注册表，不认识 `newsletter.subscribe` 这个 type。与 site-form 同构。
 */
import { registerSiteSectionHtml } from "@rewindom/builtin/marketing/shared/sections/html.js";

import { newsletterSubscribeSection } from "../shared/sections/subscribe/definition.js";
import { renderNewsletterSubscribeHtml } from "../shared/sections/subscribe/html.js";
import { NEWSLETTER_CSS } from "../shared/site-css.generated.js";

/** 在模块 `onBoot` 里调。 */
export function registerNewsletterSection(): void {
  registerSiteSectionHtml(
    newsletterSubscribeSection,
    renderNewsletterSubscribeHtml,
    { css: NEWSLETTER_CSS },
  );
}
