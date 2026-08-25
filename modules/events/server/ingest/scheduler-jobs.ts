import { config } from "@rewindom/module-sdk/server";

import { listEventIngestTenantIds, runIngest } from "./ingest.service.js";

import { runRetention } from "../retention/retention.service.js";

import type { JobRegistryContext } from "@rewindom/module-sdk/server";

/**
 * 启动后等一会儿再跑第一轮，别和迁移、缓存预热抢启动那几秒。
 *
 * 这一轮**不等于一整轮采集**：到底抓不抓由库里的 `EventFeed.last_fetched_at`
 * 决定（`isFeedDue`）。定时器活在进程里，一天发六次版就是六次重启，
 * 没有那道库侧判据的话每次重启都会多跑一整轮，账单跟着发布频率走。
 */
const INITIAL_DELAY_MS = 20_000;

/** 保留期清理按天跑一次——语料回收不需要更勤，跑太勤只会白扫描。 */
const RETENTION_INTERVAL_MS = 24 * 60 * 60 * 1000;
/** 启动后先让采集跑起来，清理不急于这一刻。 */
const RETENTION_INITIAL_DELAY_MS = 5 * 60 * 1000;

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
      /*
       * **阶段失败要按 error 报，按源失败不要。**
       *
       * 一个挂掉的 RSS 是日常（目录里两百多个源，天天有超时的），报 error
       * 只会让这条日志失去意义。而轮内阶段（聚类、刷新、摘录补齐）失败影响的是
       * 整个站点这一轮——那本来会一路抛到下面这个 catch 里按 error 报，
       * `runStage` 把它接住之后，如果不在这里分级，严重性信号就悄悄没了。
       */
      const stageFailures = summary.failures.filter((row) => row.stage);
      if (stageFailures.length > 0) {
        ctx.app.log.error(
          { ...summary, stage_failures: stageFailures.length },
          "[events] 采集完成，但有轮内阶段失败",
        );
      } else {
        ctx.app.log.info({ ...summary }, "[events] 采集完成");
      }
    } catch (err) {
      ctx.app.log.error({ err }, "[events] 采集失败");
    } finally {
      running = false;
    }
  };

  registerRetentionJob(ctx);

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

/**
 * 保留期清理。与采集分开注册：两者周期差两个数量级，
 * 塞进同一个任务会让「清理」被采集的失败与跳过牵连。
 */
function registerRetentionJob(ctx: JobRegistryContext): void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let interval: ReturnType<typeof setInterval> | null = null;
  let running = false;

  const runOnce = async (): Promise<void> => {
    if (running) {
      ctx.app.log.warn("[events] 上一轮保留期清理尚未结束，跳过本轮");
      return;
    }
    running = true;
    try {
      const summary = await runRetention({
        tenant_ids: await listEventIngestTenantIds(),
        log: ctx.app.log,
      });
      ctx.app.log.info({ ...summary }, "[events] 保留期清理完成");
    } catch (err) {
      ctx.app.log.error({ err }, "[events] 保留期清理失败");
    } finally {
      running = false;
    }
  };

  ctx.registry.register({
    id: "events-retention",
    moduleId: "events",
    label: "Event corpus retention",
    start: () => {
      timeout = setTimeout(() => void runOnce(), RETENTION_INITIAL_DELAY_MS);
      interval = setInterval(() => void runOnce(), RETENTION_INTERVAL_MS);
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
