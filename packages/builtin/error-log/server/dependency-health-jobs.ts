import { config } from "@rewindom/server-kernel/lib/config.js";
import {
  checkDependencies,
  type DependencyHealthSnapshot,
} from "@rewindom/server-kernel/lib/dependency-health.js";

import { ErrorService } from "./error.service.js";

import type { JobRegistryContext } from "@rewindom/server-kernel/runtime/job-registry.js";

const PROBE_INTERVAL_MS = 30_000;

const lastStatus = new Map<string, "ok" | "error">();

/** 测试用：清掉边沿状态，避免用例互相污染。 */
export function resetDependencyHealthState(): void {
  lastStatus.clear();
}

export async function recordDependencyTransitions(
  snapshot: DependencyHealthSnapshot,
): Promise<void> {
  if (!config.observability.errorLog.enabled) return;

  for (const check of snapshot.checks) {
    const previous = lastStatus.get(check.name) ?? "ok";
    if (previous === "ok" && check.status === "error") {
      try {
        await ErrorService.logError(
          new Error(`${check.name} unhealthy: ${check.error ?? "unknown"}`),
          {
            route: `service:${check.name}`,
            errorCode: "DependencyUnhealthy",
            additionalContext: {
              source: "dependency",
              service: check.name,
              latency_ms: check.latency_ms,
            },
          },
        );
      } catch {
        // Postgres 自己挂了时落库必然失败，探测结果仍返回给平台页。
      }
    } else if (previous === "error" && check.status === "ok") {
      try {
        await ErrorService.log({
          level: "info",
          message: `${check.name} recovered`,
          route: `service:${check.name}`,
          errorCode: "DependencyRecovered",
          context: {
            source: "dependency",
            service: check.name,
            latency_ms: check.latency_ms,
          },
        });
      } catch {
        // 恢复日志写失败不影响探测本身。
      }
    }
    lastStatus.set(check.name, check.status);
  }
}

export function registerDependencyHealthJobs(ctx: JobRegistryContext): void {
  ctx.registry.register({
    id: "error-log-dependency-health",
    moduleId: "error-log",
    label: "Dependency health probe",
    // 防重叠由注册表统一负责，这里不必再自己举一个 probing 标志
    schedules: [
      { kind: "interval", every_ms: PROBE_INTERVAL_MS, run_on_start: true },
    ],
    run: async () => {
      const snapshot = await checkDependencies({ fresh: true });
      await recordDependencyTransitions(snapshot);
    },
  });
}
