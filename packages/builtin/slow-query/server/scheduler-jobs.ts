import { config } from "@rewindom/server-kernel/lib/config.js";

import { SlowQueryService } from "./slow-query.service.js";

import type { JobRegistryContext } from "@rewindom/server-kernel/runtime/job-registry.js";

const THIRTY_MINUTES_MS = 30 * 60 * 1000;
const SLOW_QUERY_CLEANUP_HOUR = 8;
const SLOW_QUERY_CLEANUP_MINUTE = 35;

export function registerSlowQueryCleanupJobs(ctx: JobRegistryContext): void {
  ctx.registry.register({
    id: "slow-query-cleanup",
    moduleId: "slow-query",
    label: "Slow query log cleanup",
    schedules: [
      { kind: "interval", every_ms: THIRTY_MINUTES_MS },
      {
        kind: "daily",
        hour: SLOW_QUERY_CLEANUP_HOUR,
        minute: SLOW_QUERY_CLEANUP_MINUTE,
      },
    ],
    run: () =>
      SlowQueryService.cleanupOldLogs(
        config.observability.slowQuery.retentionDays,
      ),
  });
}
