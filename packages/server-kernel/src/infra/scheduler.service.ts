import type { JobRegistry } from "../runtime/job-registry.js";
import type { FastifyInstance } from "fastify";

let activeRegistry: JobRegistry | null = null;

function startJobRegistry(
  registry: JobRegistry,
  log: FastifyInstance["log"],
): void {
  // logger 交给注册表：任务失败的日志由它统一打，模块不必各写一遍 catch
  registry.startAll(log);
  log.info(
    { jobCount: registry.getJobs().length },
    "[scheduler] 已启动模块注册的后台任务",
  );
}

function stopJobRegistry(registry: JobRegistry): void {
  registry.stopAll();
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
