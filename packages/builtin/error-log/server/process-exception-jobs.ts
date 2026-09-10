import { config } from "@rewindom/server-kernel/lib/config.js";

import { ErrorService } from "./error.service.js";
import {
  createLogDebouncer,
  PROCESS_EXCEPTION_CODE,
  PROCESS_EXCEPTION_DEBOUNCE_MS,
  PROCESS_EXCEPTION_ROUTE,
  processExceptionFingerprint,
  reasonToError,
  type ProcessExceptionKind,
} from "./process-exception.js";

import type { JobRegistryContext } from "@rewindom/server-kernel/runtime/job-registry.js";

const UNCAUGHT_FLUSH_MS = 2_000;

async function persistProcessException(
  kind: ProcessExceptionKind,
  reason: unknown,
  debounce: ReturnType<typeof createLogDebouncer>,
  logError: (payload: unknown, message: string) => void,
): Promise<void> {
  if (!config.observability.errorLog.enabled) return;

  const error = reasonToError(reason);
  const fingerprint = processExceptionFingerprint(kind, error);
  const decision = debounce.take(fingerprint);
  if (decision.skip) return;

  try {
    await ErrorService.logError(error, {
      route: PROCESS_EXCEPTION_ROUTE[kind],
      errorCode: PROCESS_EXCEPTION_CODE[kind],
      additionalContext: {
        source: "process",
        ...(decision.suppressed > 0
          ? { suppressed_count: decision.suppressed }
          : {}),
      },
    });
  } catch (err) {
    logError({ err }, "[error-log] 写入进程异常失败");
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * 进程级异常不经过 Fastify error-handler，不落库就等于没发生。
 * uncaughtException 按 Node 约定：记完再退出，不假装还能继续跑。
 */
export function registerProcessExceptionJobs(ctx: JobRegistryContext): void {
  const debounce = createLogDebouncer(PROCESS_EXCEPTION_DEBOUNCE_MS);
  let onRejection: ((reason: unknown) => void) | undefined;
  let onException: ((error: Error) => void) | undefined;

  ctx.registry.register({
    id: "error-log-process-exceptions",
    moduleId: "error-log",
    label: "Process exception capture",
    start: () => {
      onRejection = (reason: unknown): void => {
        ctx.app.log.error({ err: reason }, "[process] unhandledRejection");
        void persistProcessException(
          "unhandledRejection",
          reason,
          debounce,
          (payload, message) => ctx.app.log.error(payload, message),
        );
      };
      onException = (error: Error): void => {
        ctx.app.log.error({ err: error }, "[process] uncaughtException");
        const write = persistProcessException(
          "uncaughtException",
          error,
          debounce,
          (payload, message) => ctx.app.log.error(payload, message),
        );
        void Promise.race([write, wait(UNCAUGHT_FLUSH_MS)]).finally(() => {
          if (!config.server.isTest) {
            process.exit(1);
          }
        });
      };
      process.on("unhandledRejection", onRejection);
      process.on("uncaughtException", onException);
    },
    stop: () => {
      if (onRejection) {
        process.off("unhandledRejection", onRejection);
      }
      if (onException) {
        process.off("uncaughtException", onException);
      }
      onRejection = undefined;
      onException = undefined;
    },
  });
}
