import type { ServerI18nBundle } from "@rewindom/server-kernel/runtime/module-contract.js";

export const BACKGROUND_JOB_SERVER_I18N: ServerI18nBundle = {
  id: "background-job",
  messages: {
    "zh-CN": {
      "background-job.audit.cancelled": "取消后台任务 {{job}}",
      "background-job.audit.cancelled_not_running":
        "取消后台任务 {{job}}（任务已不在运行）",
    },
    en: {
      "background-job.audit.cancelled": "Cancelled background job {{job}}",
      "background-job.audit.cancelled_not_running":
        "Cancelled background job {{job}} (not running)",
    },
  },
};
