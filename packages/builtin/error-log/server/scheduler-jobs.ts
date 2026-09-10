import { config } from "@rewindom/server-kernel/lib/config.js";

import { ErrorService } from "./error.service.js";

import type { JobRegistryContext } from "@rewindom/server-kernel/runtime/job-registry.js";

const THIRTY_MINUTES_MS = 30 * 60 * 1000;
const ERROR_LOG_CLEANUP_HOUR = 8;
const ERROR_LOG_CLEANUP_MINUTE = 30;

export function registerErrorLogCleanupJobs(ctx: JobRegistryContext): void {
  ctx.registry.register({
    id: "error-log-cleanup",
    moduleId: "error-log",
    label: "Error log cleanup",
    schedules: [
      { kind: "interval", every_ms: THIRTY_MINUTES_MS },
      {
        kind: "daily",
        hour: ERROR_LOG_CLEANUP_HOUR,
        minute: ERROR_LOG_CLEANUP_MINUTE,
      },
    ],
    // 抛出去就好：注册表负责记账、打日志、通知订阅者
    run: () =>
      ErrorService.cleanupOldLogs(config.observability.errorLog.retentionDays),
  });
}
