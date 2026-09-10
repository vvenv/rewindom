/**
 * 定时任务失败落库。
 *
 * 内核只广播「一轮跑完了」，认不得 error-log；这里订阅它，把失败写成一条
 * `job:<id>` 的 ErrorLog。运行态本身留在进程内存里（重启即清），能翻旧账的
 * 只有这张表——所以失败必须落，而不只是打进 app.log。
 */
import { config } from "@rewindom/server-kernel/lib/config.js";
import {
  addJobRunRecorder,
  type JobRunSample,
  type JobRegistryContext,
} from "@rewindom/server-kernel/runtime/job-registry.js";

import { ErrorService } from "./error.service.js";
import {
  createLogDebouncer,
  PROCESS_EXCEPTION_DEBOUNCE_MS,
} from "./process-exception.js";

export const JOB_FAILURE_CODE = "JobFailed";
export const JOB_RECOVERY_CODE = "JobRecovered";

export function jobErrorRoute(jobId: string): string {
  return `job:${jobId}`;
}

const failing = new Set<string>();

/** 测试用：清掉边沿状态，避免用例互相污染。 */
export function resetJobFailureState(): void {
  failing.clear();
}

export async function recordJobRun(
  sample: JobRunSample,
  debounce: ReturnType<typeof createLogDebouncer>,
): Promise<void> {
  if (!config.observability.errorLog.enabled) return;

  const context = {
    source: "job",
    job_id: sample.job_id,
    module_id: sample.module_id,
    duration_ms: sample.duration_ms,
  };

  if (sample.status === "error") {
    failing.add(sample.job_id);
    // 一分钟一轮的任务持续失败会把表打满，同指纹只留一条
    const decision = debounce.take(
      `${sample.job_id}:${sample.error ?? "unknown"}`,
    );
    if (decision.skip) return;

    await ErrorService.logError(
      new Error(`${sample.label} failed: ${sample.error ?? "unknown"}`),
      {
        route: jobErrorRoute(sample.job_id),
        errorCode: JOB_FAILURE_CODE,
        additionalContext: {
          ...context,
          consecutive_failures: sample.consecutive_failures,
          ...(decision.suppressed > 0
            ? { suppressed_count: decision.suppressed }
            : {}),
        },
      },
    );
    return;
  }

  // 只有失败过才值得记恢复，否则每一轮成功都会写一条
  if (!failing.delete(sample.job_id)) return;

  await ErrorService.log({
    level: "info",
    message: `${sample.label} recovered`,
    route: jobErrorRoute(sample.job_id),
    errorCode: JOB_RECOVERY_CODE,
    context,
  });
}

export function registerJobFailureReporter(ctx: JobRegistryContext): void {
  const debounce = createLogDebouncer(PROCESS_EXCEPTION_DEBOUNCE_MS);
  let unsubscribe: (() => void) | undefined;

  ctx.registry.register({
    id: "error-log-job-failures",
    moduleId: "error-log",
    label: "Job failure capture",
    start: () => {
      unsubscribe = addJobRunRecorder((sample) => {
        void recordJobRun(sample, debounce).catch((err: unknown) => {
          // 库挂了时写不进去很正常，不能让它反过来把任务循环打断
          ctx.app.log.error({ err }, "[error-log] 写入任务失败记录失败");
        });
      });
    },
    stop: () => {
      unsubscribe?.();
      unsubscribe = undefined;
    },
  });
}
