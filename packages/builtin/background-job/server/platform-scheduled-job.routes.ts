/**
 * 平台定时任务的只读视图。
 *
 * 数据来自内核 `JobRegistry` 的进程内运行态——没有表、没有跨实例聚合：多实例部署时
 * 每个实例只认得自己那一份。能翻旧账的是 ErrorLog 里的 `job:<id>`，这里回答的是
 * 「此刻这台机器上的任务还在正常转吗」。
 *
 * 注册表由 `registerJobs` 递进来（路由拿不到它，而模块不能反向 import 组装层）。
 * 顺序是安全的：模块装配阶段 registerRoutes 先于 registerJobs，两者都在收请求之前。
 */
import { handleRouteError } from "@rewindom/server-kernel/http/route-error-handler.js";
import { success } from "@rewindom/shared";

import type { ScheduledJobOverview } from "../shared/scheduled-job.js";
import type { JobRegistry } from "@rewindom/server-kernel/runtime/job-registry.js";
import type { FastifyInstance } from "fastify";

let activeRegistry: JobRegistry | null = null;
let startedAt: string | null = null;

export function setScheduledJobRegistry(registry: JobRegistry | null): void {
  activeRegistry = registry;
  startedAt = registry ? new Date().toISOString() : null;
}

export function buildScheduledJobOverview(
  registry: JobRegistry | null,
  since: string | null,
): ScheduledJobOverview {
  const items = (registry?.getRunStates() ?? []).map((state) => ({
    ...state,
    schedules: [...state.schedules],
  }));

  return {
    since: since ?? new Date().toISOString(),
    total: items.length,
    failing: items.filter((item) => item.consecutive_failures > 0).length,
    items,
  };
}

export async function registerPlatformScheduledJobRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get("/scheduled-jobs", async (_request, reply) => {
    try {
      return reply.send(
        success(buildScheduledJobOverview(activeRegistry, startedAt)),
      );
    } catch (err) {
      return handleRouteError(
        reply,
        err,
        "[platformScheduledJobRoutes] 获取定时任务运行态失败",
        "LIST_PLATFORM_SCHEDULED_JOBS_FAILED",
      );
    }
  });
}
