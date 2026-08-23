import { NEWSLETTER_ENTITLEMENT } from "../shared/entitlements.js";

import { registerNewsletterDigestJob } from "./digest.job.js";
import { NEWSLETTER_SERVER_I18N } from "./i18n.js";
import { newsletterRoutes } from "./newsletter.routes.js";
import { newsletterSsrRoutes } from "./newsletter.ssr.js";
import { publicNewsletterRoutes } from "./public-subscribe.routes.js";
import { registerNewsletterSection } from "./register.js";

import { registerTenantGatedRoutes } from "@rewindom/module-sdk/server";

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
    ],
  },
  server: {
    i18n: NEWSLETTER_SERVER_I18N,
    onBoot: async () => {
      registerNewsletterSection();
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
