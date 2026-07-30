import { registerTenantGatedRoutes } from "@be-water/server-kernel/runtime/register-tenant-gated-routes.js";

import { BILLING_ENTITLEMENT } from "../shared/entitlements.js";

import { billingRoutes, billingWebhookRoutes } from "./billing.routes.js";
import { registerPlatformBillingRoutes } from "./platform-billing.routes.js";

import type { ServerAppModule } from "@be-water/server-kernel/runtime/module-contract.js";

export const billingServerModule: ServerAppModule = {
  id: "billing",
  version: "1.0.0",
  label: "Billing",
  kind: "business",
  description: "租户订阅与付款（Creem Payment Provider）",
  requires: ["rbac", "audit", "platform"],
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
