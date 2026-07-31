import type { ServerI18nBundle } from "@be-water/server-kernel/runtime/module-contract.js";

export const ERROR_LOG_SERVER_I18N: ServerI18nBundle = {
  id: "error-log",
  messages: {
    "zh-CN": {
      "error-log.audit.tenant_cleaned":
        "清理租户内 {{days}} 天前的错误日志，删除 {{deleted_count}} 条",
      "error-log.audit.user_cleaned":
        "清理本人 {{days}} 天前的错误日志，删除 {{deleted_count}} 条",
      "error-log.audit.deleted": "删除错误日志 {{id}}",
    },
    en: {
      "error-log.audit.tenant_cleaned":
        "Cleaned tenant error logs older than {{days}} days; deleted {{deleted_count}}",
      "error-log.audit.user_cleaned":
        "Cleaned own error logs older than {{days}} days; deleted {{deleted_count}}",
      "error-log.audit.deleted": "Deleted error log {{id}}",
    },
  },
};
