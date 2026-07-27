import type { JobRegistry } from "../runtime/job-registry.js";
import type { FastifyInstance } from "fastify";

let activeRegistry: JobRegistry | null = null;

function startJobRegistry(
  registry: JobRegistry,
  log: FastifyInstance["log"],
): void {
  registry.startAll();
  log.info(
    { jobCount: registry.getJobs().length },
    "[scheduler] 已启动模块注册的后台任务",
  );
}

function stopJobRegistry(registry: JobRegistry): void {
  registry.stopAll();
}

export function getMsUntilLocalTime(hour: number, minute: number): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
}

export function startBackgroundScheduler(
  app: FastifyInstance,
  registry: JobRegistry,
): void {
  activeRegistry = registry;
  startJobRegistry(registry, app.log);
}

export function stopBackgroundScheduler(): void {
  if (activeRegistry) {
    stopJobRegistry(activeRegistry);
    activeRegistry = null;
  }
}
