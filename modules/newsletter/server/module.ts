import { NEWSLETTER_ENTITLEMENT } from "../shared/entitlements.js";

import {
  clearBounceCount,
  handleBounce,
  handleComplaint,
} from "./bounce.service.js";
import { registerNewsletterDigestJob } from "./digest.job.js";
import { NEWSLETTER_SERVER_I18N } from "./i18n.js";
import { newsletterRoutes } from "./newsletter.routes.js";
import { newsletterSsrRoutes } from "./newsletter.ssr.js";
import { publicNewsletterRoutes } from "./public-subscribe.routes.js";
import { registerNewsletterSiteContributions } from "./register.js";

import { registerReservedPageSlug } from "@rewindom/builtin/marketing/shared/reserved-slugs.js";
import { registerTenantGatedRoutes } from "@rewindom/module-sdk/server";

import { NEWSLETTER_SUBSCRIBE_PATH } from "../shared/newsletter-page-templates.js";

import type { ServerAppModule } from "@rewindom/module-sdk/server";

export const newsletterServerModule: ServerAppModule = {
  id: "newsletter",
  version: "1.0.0",
  label: "Newsletter",
  kind: "business",
  description: "访客邮件订阅：双重确认、定时摘要投递、一键退订",
  /*
   * marketing：贡献官网段与 enhance 脚本。
   *
   * **mailer 不在这里**：发信经 `app.registry.getMailProvider()` 拿，编译期不 import
   * 那个包，与 rbac 的 AuthzProvider 同形。写进 requires 反而过不了 check:deps。
   */
  requires: ["rbac", "audit", "marketing"],
  tenantEntitlements: [NEWSLETTER_ENTITLEMENT],
  shared: {
    permissions: [
      {
        key: "newsletter.read",
        label: "查看订阅者",
        group: "邮件订阅",
        description: "查看订阅者名单与摘要投递记录",
      },
      {
        key: "newsletter.write",
        label: "管理订阅",
        group: "邮件订阅",
        description: "删除订阅者、导出名单、手动触发摘要",
      },
    ],
    auditActions: [
      { action: "NEWSLETTER_SUBSCRIBER_DELETE", label: "删除订阅者" },
      { action: "NEWSLETTER_SUBSCRIBER_EXPORT", label: "导出订阅者名单" },
      { action: "NEWSLETTER_DIGEST_RUN", label: "手动触发摘要投递" },
      { action: "NEWSLETTER_SUBSCRIBER_REACTIVATE", label: "恢复订阅者发送" },
    ],
  },
  server: {
    i18n: NEWSLETTER_SERVER_I18N,
    onBoot: async (ctx) => {
      registerNewsletterSiteContributions();
      /*
       * `/subscribe` 由本模块的静态路由承接，比 marketing 的 `/:first` 更具体。
       * 不登记成保留字的话，租户建一张 slug 为 `subscribe` 的 CMS 页会被永远盖住
       * ——页面在中台列着、点开却是订阅页，查起来极难。
       */
      registerReservedPageSlug(NEWSLETTER_SUBSCRIBE_PATH.slice(1));

      /*
       * 订阅 mailer 广播的退信 / 投诉。**这不是编译期依赖**——只是一个事件名，
       * 所以 `requires` 里依然没有 mailer。
       *
       * 处理失败不阻塞发布方（EventBus 的既有约定），但要落日志：回调丢了意味着
       * 一个死地址会继续被投递，那是要能查到的。
       */
      ctx.events.on("mail.bounced", async (payload) => {
        try {
          const result = await handleBounce({
            tenant_id: payload.tenant_id,
            email: payload.email,
            bounce_type: payload.bounce_type,
          });
          if (result === "suppressed") {
            ctx.log.info(
              { email: payload.email, type: payload.bounce_type },
              "[newsletter] 退信停发",
            );
          }
        } catch (err) {
          ctx.log.error({ err }, "[newsletter] 处理退信失败");
        }
      });

      /*
       * 送达确认清软退信计数。这一步是「连续 N 次」里**连续**二字的全部实现——
       * 放在「交给中继成功」那一刻是不对的：那不代表收件方真的收到了。
       */
      ctx.events.on("mail.delivered", async (payload) => {
        try {
          await clearBounceCount({
            tenant_id: payload.tenant_id,
            email: payload.email,
          });
        } catch (err) {
          ctx.log.error({ err }, "[newsletter] 清退信计数失败");
        }
      });

      ctx.events.on("mail.complained", async (payload) => {
        try {
          await handleComplaint({
            tenant_id: payload.tenant_id,
            email: payload.email,
          });
        } catch (err) {
          ctx.log.error({ err }, "[newsletter] 处理投诉失败");
        }
      });
    },
    registerRoutes: async (app) => {
      /*
       * 公开口与两张 SSR 页都**不进 entitlement 网关**：那层要的是工作台的租户上下文，
       * 而这里是访客。站点没开通订阅时段本来就不渲染，也就没有入口。
       *
       * 退订页尤其不能挂在开关后面——站长关掉订阅功能之后，存量订阅者手里那些
       * 退订链接必须继续有效，否则他们只能去点「举报垃圾邮件」。
       */
      await app.register(publicNewsletterRoutes, {
        prefix: "/api/public/newsletter",
      });
      await app.register(newsletterSsrRoutes);

      await registerTenantGatedRoutes(
        app,
        NEWSLETTER_ENTITLEMENT.key,
        async (scoped) => {
          await scoped.register(newsletterRoutes, {
            prefix: "/api/newsletter",
          });
        },
      );
    },
    registerJobs: registerNewsletterDigestJob,
  },
};
