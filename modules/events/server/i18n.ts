import type { ServerI18nBundle } from "@rewindom/module-sdk/server";

/**
 * API 错误与审计模板文案，按稳定 code 提供。
 * 租户侧文案不出现「租户」「Tenant」（见 tenancy-mode rule）。
 */
export const EVENTS_SERVER_I18N: ServerI18nBundle = {
  id: "events",
  messages: {
    "zh-CN": {
      "events.not_found": "事件不存在或已被清理",
      "events.audit.followed": "关注事件：{{event}}",
      "events.audit.unfollowed": "取消关注事件：{{event}}",
    },
    en: {
      "events.not_found": "Event not found or already pruned",
      "events.audit.followed": "Followed event: {{event}}",
      "events.audit.unfollowed": "Unfollowed event: {{event}}",
    },
  },
};
