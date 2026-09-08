import type { ServerI18nBundle } from "@rewindom/server-kernel/runtime/module-contract.js";

/**
 * 租户面文案不出现「租户」「Tenant」（见 tenancy-mode rule）——对站点管理员来说
 * 他管的是「本站点」，不是「某个租户」。
 *
 * 被拦截时回的 `ip_access.forbidden` 刻意什么都不说：不提是哪条规则、不回显对方
 * IP、不告知何时解封。那些信息只会帮对方调试绕过方式。
 */
export const IP_ACCESS_SERVER_I18N: ServerI18nBundle = {
  id: "ip-access",
  messages: {
    "zh-CN": {
      "ip_access.forbidden": "拒绝访问",
      "ip_access.not_found": "访问规则不存在",
      "ip_access.invalid_cidr": "不是合法的 IP 或 IP 段",
      "ip_access.invalid_action": "处置方式无效",
      "ip_access.invalid_mode": "生效方式无效",
      "ip_access.invalid_expires_at": "过期时间格式无效",
      "ip_access.reason_required": "请填写原因",
      "ip_access.reason_too_long": "原因最多 {{max}} 个字符",
      "ip_access.duplicate": "{{cidr}} 已经在名单里了",
      "ip_access.auto_requires_expiry": "自动规则必须设置过期时间",
      "ip_access.self_lockout":
        "{{cidr}} 包含你当前的 IP，这条规则一旦生效你自己也会被拦在外面。请先用「仅记录」观察，或改窄范围。",
      "ip_access.audit.created":
        "新增访问规则 {{cidr}}（{{rule_action}} / {{mode}}）",
      "ip_access.audit.updated":
        "更新访问规则 {{cidr}}（{{rule_action}} / {{mode}}）",
      "ip_access.audit.deleted": "删除访问规则 {{cidr}}",
      "ip_access.audit.exported": "导出边缘层封禁名单，共 {{count}} 条",
    },
    en: {
      "ip_access.forbidden": "Access denied",
      "ip_access.not_found": "Access rule not found",
      "ip_access.invalid_cidr": "Not a valid IP address or range",
      "ip_access.invalid_action": "Invalid action",
      "ip_access.invalid_mode": "Invalid mode",
      "ip_access.invalid_expires_at": "Invalid expiry timestamp",
      "ip_access.reason_required": "A reason is required",
      "ip_access.reason_too_long": "Reason must be at most {{max}} characters",
      "ip_access.duplicate": "{{cidr}} is already on the list",
      "ip_access.auto_requires_expiry":
        "Automatic rules must have an expiry time",
      "ip_access.self_lockout":
        "{{cidr}} covers your current IP — enforcing this rule would lock you out. Use log-only first, or narrow the range.",
      "ip_access.audit.created":
        "Added access rule {{cidr}} ({{rule_action}} / {{mode}})",
      "ip_access.audit.updated":
        "Updated access rule {{cidr}} ({{rule_action}} / {{mode}})",
      "ip_access.audit.deleted": "Deleted access rule {{cidr}}",
      "ip_access.audit.exported": "Exported edge blocklist with {{count}} rules",
    },
  },
};
