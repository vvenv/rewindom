import { config } from "@rewindom/module-sdk/server";

import { runIngest } from "./ingest.service.js";

import type { JobRegistryContext } from "@rewindom/module-sdk/server";

/** 启动后等一会儿再跑第一轮，别和迁移、缓存预热抢启动那几秒。 */
const INITIAL_DELAY_MS = 20_000;

export function registerEventIngestJobs(ctx: JobRegistryContext): void {
  if (!config.events.ingestEnabled) {
    ctx.app.log.info("[events] EVENTS_INGEST_ENABLED=false，跳过采集任务注册");
    return;
  }

  const intervalMs = config.events.ingestIntervalMinutes * 60 * 1000;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let interval: ReturnType<typeof setInterval> | null = null;
  /** 一轮没跑完就到下一个周期时直接跳过，而不是让两轮叠在一起抓同样的源。 */
  let running = false;

  const runOnce = async (): Promise<void> => {
    if (running) {
      ctx.app.log.warn("[events] 上一轮采集尚未结束，跳过本轮");
      return;
    }
    running = true;
    try {
      const summary = await runIngest({ log: ctx.app.log });
      ctx.app.log.info({ ...summary }, "[events] 采集完成");
    } catch (err) {
      ctx.app.log.error({ err }, "[events] 采集失败");
    } finally {
      running = false;
    }
  };

  ctx.registry.register({
    id: "events-ingest",
    moduleId: "events",
    label: "Event signal ingest",
    start: () => {
      timeout = setTimeout(() => void runOnce(), INITIAL_DELAY_MS);
      interval = setInterval(() => void runOnce(), intervalMs);
    },
    stop: () => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    },
  });
}
