import { registerTenantGatedRoutes } from "@rewindom/server-kernel/runtime/register-tenant-gated-routes.js";

import { BILLING_ENTITLEMENT } from "../shared/entitlements.js";

import { billingRoutes, billingWebhookRoutes } from "./billing.routes.js";
import { BILLING_SERVER_I18N } from "./i18n.js";
import { registerBillingPlansSection } from "./plans-section.js";
import { registerPlatformBillingRoutes } from "./platform-billing.routes.js";
import "./billing-preset-i18n.js";

import type { ServerAppModule } from "@rewindom/server-kernel/runtime/module-contract.js";

export const billingServerModule: ServerAppModule = {
  id: "billing",
  version: "1.0.0",
  label: "Billing",
  kind: "business",
  description: "组织订阅与付款（Creem Payment Provider）",
  // marketing：把「套餐」段的渲染器填进它的段注册表（marketing 不反向依赖）
  requires: ["rbac", "audit", "platform", "marketing"],
  tenantEntitlements: [BILLING_ENTITLEMENT],
  shared: {
    permissions: [
      {
        key: "billing.read",
        label: "查看订阅与付款",
        group: "订阅与付款",
        description: "查看当前订阅、可售套餐与付款历史",
      },
      {
        key: "billing.write",
        label: "管理订阅与付款",
        group: "订阅与付款",
        description: "发起结账与取消订阅",
      },
    ],
    auditActions: [
      { action: "BILLING_CHECKOUT_CREATE", label: "创建付款结账" },
      { action: "BILLING_SUBSCRIPTION_CANCEL", label: "取消订阅" },
      { action: "BILLING_WEBHOOK_SYNC", label: "同步付款 webhook" },
    ],
  },
  server: {
    i18n: BILLING_SERVER_I18N,
    // 官网的「套餐」段：定义在本模块，渲染器填进 marketing 的段注册表
    onBoot: async () => {
      registerBillingPlansSection();
    },
    registerRoutes: async (app) => {
      await app.register(billingWebhookRoutes, {
        prefix: "/api/billing/webhooks",
      });

      await registerTenantGatedRoutes(app, "billing", async (scoped) => {
        await scoped.register(billingRoutes, { prefix: "/api/billing" });
      });

      await app.register(
        async (platformApp) => {
          platformApp.addHook("onRequest", app.requirePlatformAdmin);
          await registerPlatformBillingRoutes(platformApp);
        },
        { prefix: "/api/platform" },
      );
    },
  },
};
