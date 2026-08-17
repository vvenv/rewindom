import { registerTenantGatedRoutes } from "@rewindom/server-kernel/runtime/register-tenant-gated-routes.js";

import { SITE_BILLING_ENTITLEMENT } from "../shared/entitlements.js";
import { registerSiteBillingPageTemplates } from "../shared/member-billing-templates.js";
import { registerSiteBillingMemberMenuLink } from "../shared/member-menu-link.js";

import { registerMemberBillingAccountSection } from "./account-section.js";
import { SITE_BILLING_SERVER_I18N } from "./i18n.js";
import { memberBillingPageRoutes } from "./member-billing.ssr.js";
import { registerMemberPlansSection } from "./plans-section.js";
import { siteBillingRoutes, siteBillingWebhookRoutes } from "./site-billing.routes.js";

import type { ServerAppModule } from "@rewindom/server-kernel/runtime/module-contract.js";

export const siteBillingServerModule: ServerAppModule = {
  id: "site-billing",
  version: "1.0.0",
  label: "Site billing",
  kind: "business",
  description: "站点会员的订阅套餐、结账与付款记录",
  /*
   * `billing` 这条边只为**支付通道**：`PaymentProvider` 抽象与 Creem 封装在那边
   *（`createCreemProvider`）。两个领域各收各的钱、各有各的表，共用的只有那层壳。
   * 单向依赖，不成环。
   */
  requires: ["rbac", "audit", "platform", "marketing", "site-member", "billing"],
  tenantEntitlements: [SITE_BILLING_ENTITLEMENT],
  shared: {
    permissions: [
      {
        key: "site_billing.read",
        label: "查看会员付费",
        group: "会员付费",
        description: "查看会员套餐、订阅与付款记录",
      },
      {
        key: "site_billing.write",
        label: "管理会员付费",
        group: "会员付费",
        description: "增删改会员套餐、配置收款通道",
      },
    ],
    auditActions: [
      { action: "SITE_BILLING_PLAN_CREATE", label: "新建会员套餐" },
      { action: "SITE_BILLING_PLAN_UPDATE", label: "修改会员套餐" },
      { action: "SITE_BILLING_PLAN_DELETE", label: "删除会员套餐" },
      { action: "SITE_BILLING_PROVIDER_UPDATE", label: "更新会员收款通道" },
      { action: "SITE_BILLING_WEBHOOK_SYNC", label: "同步会员付费 webhook" },
    ],
  },
  server: {
    i18n: SITE_BILLING_SERVER_I18N,
    onBoot: async () => {
      // 官网的两个段与一张模板页：定义在本模块，填进 marketing 的注册表
      registerSiteBillingPageTemplates();
      registerSiteBillingMemberMenuLink();
      registerMemberPlansSection();
      registerMemberBillingAccountSection();
    },
    registerRoutes: async (app) => {
      /*
       * webhook 免 JWT，也**不能**套 registerTenantGatedRoutes：那时没有
       * request.tenantContext，网关会崩。站点归属由报文里的 tenant_id + 验签确定。
       */
      await app.register(siteBillingWebhookRoutes, {
        prefix: "/api/site-billing/webhooks",
      });

      /*
       * 会员的账单**页面**（不是接口），挂在根路径上，与官网 SSR 同一条渲染管线。
       * 静态路径比 marketing 的 catch-all `/*` 更具体，find-my-way 先命中这里。
       */
      await app.register(memberBillingPageRoutes);

      await registerTenantGatedRoutes(app, SITE_BILLING_ENTITLEMENT.key, async (scoped) => {
        await scoped.register(siteBillingRoutes, { prefix: "/api/site-billing" });
      });
    },
  },
};
