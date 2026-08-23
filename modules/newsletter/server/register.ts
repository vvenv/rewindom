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

import { buildNewsletterSectionContext } from "./section-context.js";

import { newsletterContextEntry } from "../shared/newsletter-section-context.js";

import { registerSectionContextProvider } from "@rewindom/builtin/marketing/server/section-context-providers.js";
import { registerChromeBlockHtml } from "@rewindom/builtin/marketing/shared/sections/_common/chrome-html.js";
import { registerSiteSectionHtml } from "@rewindom/builtin/marketing/shared/sections/html.js";
import { registerLinkTargetProvider } from "@rewindom/builtin/marketing/server/link-target-providers.js";
import { findPagesUsingSection } from "@rewindom/builtin/marketing/server/section-usage.service.js";
import { translateServerMessage } from "@rewindom/module-sdk/server";

import { buildSubscribeLinkTargets } from "../shared/newsletter-link-targets.js";
import { NEWSLETTER_SUBSCRIBE_PATH } from "../shared/newsletter-page-templates.js";
import { NEWSLETTER_SUBSCRIBE_SECTION_TYPE } from "../shared/sections/subscribe/definition.js";

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

  /*
   * 订阅段表单下面那一行说明（订的是什么、多久一封）的文案。
   *
   * 订阅段可以摆在任意页面上（首页、页脚上方都常见），那些页走的是 marketing 的
   * 通用渲染管线，不是本模块的 `/subscribe` 路由——没有这个 provider，
   * 首页上的订阅框就会缺这一行，而订阅页上有，同一个段在两处长得不一样。
   *
   * 按需调用：页面上没摆订阅段就一次查询都不发。
   */
  registerSectionContextProvider({
    sectionTypes: [NEWSLETTER_SUBSCRIBE_SECTION_TYPE],
    provide: async (input) =>
      newsletterContextEntry(
        await buildNewsletterSectionContext({
          tenant_id: input.tenantId,
          locale: input.locale,
          // 访客写的，校验在 `resolveSubscribeScope` 里
          requested_list: input.query?.list,
        }),
      ),
  });

  /*
   * 「填链接」下拉里的订阅入口。
   *
   * events 的 hero 次按钮是通用的 `linkSettings("secondary")`——**它不需要认识
   * newsletter**，租户在这个下拉里点一下就够了。耦合活在租户存下来的那个 href 里，
   * 不在任何一方的代码里。
   *
   * 跳页与锚点都给：前者跳到摆了订阅段的那一页，后者在同一页内滚过去。
   * 锚点候选只在租户给那一段填了 anchor 时才出现——没填就没有可跳的目标，
   * 列一条点了没反应的候选比不列更糟。
   */
  registerLinkTargetProvider({
    provide: async (tenantId, defaultLocale) => {
      const usages = await findPagesUsingSection(
        tenantId,
        NEWSLETTER_SUBSCRIBE_SECTION_TYPE,
      );
      const t = (code: string): string =>
        translateServerMessage(defaultLocale, { code });

      // 判断逻辑在 shared 里（有单测）：裸路径只在「整页就是订阅页」时才成立
      return buildSubscribeLinkTargets({
        usages,
        ownPath: NEWSLETTER_SUBSCRIBE_PATH,
        labels: {
          subscribe: t("newsletter.link.subscribe"),
          jumpToSection: t("newsletter.link.jumpToSection"),
          samePage: t("newsletter.link.samePage"),
        },
      });
    },
  });
}
