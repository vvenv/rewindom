import type { ServerI18nBundle } from "@be-water/server-kernel/runtime/module-contract.js";

export const BILLING_SERVER_I18N: ServerI18nBundle = {
  id: "billing",
  messages: {
    "zh-CN": {
      "billing.audit.checkout_created": "创建结账：套餐 {{plan_slug}}",
      "billing.audit.subscription_cancelled":
        "取消订阅：{{provider_subscription_id}}",
      "billing.audit.webhook_synced":
        "Creem webhook {{event_type}}：{{detail}}",
    },
    en: {
      "billing.audit.checkout_created":
        "Created checkout for plan {{plan_slug}}",
      "billing.audit.subscription_cancelled":
        "Cancelled subscription {{provider_subscription_id}}",
      "billing.audit.webhook_synced":
        "Synced Creem webhook {{event_type}}: {{detail}}",
    },
  },
};
