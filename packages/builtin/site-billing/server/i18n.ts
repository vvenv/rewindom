import type { ServerI18nBundle } from "@be-water/server-kernel/runtime/module-contract.js";

/**
 * API / 审计文案（按稳定 code）。
 *
 * 会员在公开面上看到的那几句错误也走这里——`errorMessage()` 按访客语言翻，
 * 站点是中文的就不该冒出一句英文。
 */
export const SITE_BILLING_SERVER_I18N: ServerI18nBundle = {
  id: "site-billing",
  messages: {
    "zh-CN": {
      "site_billing.plan_not_found": "套餐不存在或已下架",
      "site_billing.plan_not_purchasable": "该套餐尚未配置收款商品，暂时无法购买",
      "site_billing.plan_required": "请选择一个套餐",
      "site_billing.plan_slug_invalid":
        "套餐标识只能用小写字母、数字与连字符，且不超过 63 个字符",
      "site_billing.plan_slug_taken": "套餐标识 {{slug}} 已被占用",
      "site_billing.plan_price_invalid": "价格必须是不小于 0 的整数（单位：分）",
      "site_billing.plan_interval_invalid": "计费周期只能是按月、按年或一次性",
      "site_billing.plan_name_required": "至少填写一种语言的套餐名",
      "site_billing.plan_in_use": "还有 {{count}} 位会员在订阅该套餐，请先停售",
      "site_billing.provider_unconfigured": "本站点尚未配置收款通道",
      "site_billing.no_cancellable": "当前没有可取消的订阅",
      "site_billing.webhook_raw_body_missing": "缺少 webhook 原始报文",
      "site_billing.webhook_tenant_missing": "webhook 报文里没有站点标识",
      "site_billing.webhook_invalid": "webhook 验签失败",
      "site_billing.webhook_failed": "webhook 处理失败",
      "site_billing.audit.plan_created": "新建会员套餐：{{slug}}",
      "site_billing.audit.plan_updated": "修改会员套餐：{{slug}}",
      "site_billing.audit.plan_deleted": "删除会员套餐：{{plan_id}}",
      "site_billing.audit.provider_updated": "更新会员付费收款通道配置",
      "site_billing.audit.webhook_synced":
        "会员付费 webhook {{event_type}}：{{detail}}",
    },
    en: {
      "site_billing.plan_not_found": "This plan no longer exists",
      "site_billing.plan_not_purchasable":
        "This plan has no payment product configured yet",
      "site_billing.plan_required": "Pick a plan first",
      "site_billing.plan_slug_invalid":
        "Plan key accepts lowercase letters, digits and hyphens, up to 63 characters",
      "site_billing.plan_slug_taken": "Plan key {{slug}} is already taken",
      "site_billing.plan_price_invalid":
        "Price must be a whole number of cents, zero or greater",
      "site_billing.plan_interval_invalid":
        "Billing interval must be monthly, yearly or one-time",
      "site_billing.plan_name_required": "Give the plan a name in at least one language",
      "site_billing.plan_in_use":
        "{{count}} member(s) still subscribe to this plan — stop selling it first",
      "site_billing.provider_unconfigured":
        "This site has no payment provider configured",
      "site_billing.no_cancellable": "There is no subscription to cancel",
      "site_billing.webhook_raw_body_missing": "Missing raw webhook body",
      "site_billing.webhook_tenant_missing": "Webhook payload carries no site id",
      "site_billing.webhook_invalid": "Webhook signature verification failed",
      "site_billing.webhook_failed": "Failed to process webhook",
      "site_billing.audit.plan_created": "Created member plan {{slug}}",
      "site_billing.audit.plan_updated": "Updated member plan {{slug}}",
      "site_billing.audit.plan_deleted": "Deleted member plan {{plan_id}}",
      "site_billing.audit.provider_updated":
        "Updated member billing payment provider settings",
      "site_billing.audit.webhook_synced":
        "Synced member billing webhook {{event_type}}: {{detail}}",
    },
  },
};
