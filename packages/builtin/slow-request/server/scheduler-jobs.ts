import { config } from "@rewindom/server-kernel/lib/config.js";

import { SlowRequestService } from "./slow-request.service.js";

import type { JobRegistryContext } from "@rewindom/server-kernel/runtime/job-registry.js";

const THIRTY_MINUTES_MS = 30 * 60 * 1000;
const SLOW_REQUEST_CLEANUP_HOUR = 8;
const SLOW_REQUEST_CLEANUP_MINUTE = 40;

export function registerSlowRequestCleanupJobs(ctx: JobRegistryContext): void {
  ctx.registry.register({
    id: "slow-request-cleanup",
    moduleId: "slow-request",
    label: "Slow request log cleanup",
    schedules: [
      { kind: "interval", every_ms: THIRTY_MINUTES_MS },
      {
        kind: "daily",
        hour: SLOW_REQUEST_CLEANUP_HOUR,
        minute: SLOW_REQUEST_CLEANUP_MINUTE,
      },
    ],
    run: () =>
      SlowRequestService.cleanupOldLogs(
        config.observability.slowRequest.retentionDays,
      ),
  });
}
