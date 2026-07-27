import { getMsUntilLocalTime } from "@be-water/server-kernel/infra/scheduler.service.js";
import { config } from "@be-water/server-kernel/lib/config.js";

import { SlowQueryService } from "./slow-query.service.js";

import type { JobRegistryContext } from "@be-water/server-kernel/runtime/job-registry.js";

const THIRTY_MINUTES_MS = 30 * 60 * 1000;
const SLOW_QUERY_CLEANUP_HOUR = 8;
const SLOW_QUERY_CLEANUP_MINUTE = 35;

export function registerSlowQueryCleanupJobs(ctx: JobRegistryContext): void {
  const intervals: ReturnType<typeof setInterval>[] = [];
  const timeouts: ReturnType<typeof setTimeout>[] = [];

  const cleanup = (): void => {
    void SlowQueryService.cleanupOldLogs(
      config.observability.slowQuery.retentionDays,
    ).catch((err: unknown) => {
      ctx.app.log.error({ err }, "[scheduler] 慢查询日志清理失败");
    });
  };

  const scheduleDailyAt = (hour: number, minute: number, fn: () => void): void => {
    const runAndReschedule = (): void => {
      fn();
      const timeoutId = setTimeout(
        runAndReschedule,
        getMsUntilLocalTime(hour, minute),
      );
      timeouts.push(timeoutId);
    };
    const initialTimeoutId = setTimeout(
      runAndReschedule,
      getMsUntilLocalTime(hour, minute),
    );
    timeouts.push(initialTimeoutId);
  };

  ctx.registry.register({
    id: "slow-query-cleanup",
    moduleId: "slow-query",
    label: "Slow query log cleanup",
    start: () => {
      scheduleDailyAt(
        SLOW_QUERY_CLEANUP_HOUR,
        SLOW_QUERY_CLEANUP_MINUTE,
        cleanup,
      );
      intervals.push(setInterval(cleanup, THIRTY_MINUTES_MS));
    },
    stop: () => {
      for (const id of intervals) {
        clearInterval(id);
      }
      for (const id of timeouts) {
        clearTimeout(id);
      }
      intervals.length = 0;
      timeouts.length = 0;
    },
  });
}
