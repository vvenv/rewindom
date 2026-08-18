import { getMsUntilLocalTime } from "@rewindom/server-kernel/infra/scheduler.service.js";
import { config } from "@rewindom/server-kernel/lib/config.js";

import { SlowRequestService } from "./slow-request.service.js";

import type { JobRegistryContext } from "@rewindom/server-kernel/runtime/job-registry.js";

const THIRTY_MINUTES_MS = 30 * 60 * 1000;
const SLOW_REQUEST_CLEANUP_HOUR = 8;
const SLOW_REQUEST_CLEANUP_MINUTE = 40;

export function registerSlowRequestCleanupJobs(ctx: JobRegistryContext): void {
  const intervals: ReturnType<typeof setInterval>[] = [];
  const timeouts: ReturnType<typeof setTimeout>[] = [];

  const cleanup = (): void => {
    void SlowRequestService.cleanupOldLogs(
      config.observability.slowRequest.retentionDays,
    ).catch((err: unknown) => {
      ctx.app.log.error({ err }, "[scheduler] 慢请求日志清理失败");
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
    id: "slow-request-cleanup",
    moduleId: "slow-request",
    label: "Slow request log cleanup",
    start: () => {
      scheduleDailyAt(
        SLOW_REQUEST_CLEANUP_HOUR,
        SLOW_REQUEST_CLEANUP_MINUTE,
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
