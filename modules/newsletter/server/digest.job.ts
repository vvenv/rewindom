/**
 * 摘要投递任务。
 *
 * 每小时醒一次，具体发不发由库里的 `NewsletterDigestRun.last_run_at` 决定
 *（`isDue`）——定时器活在进程里，一天发六次版就是六次重启，没有那道库侧判据的话
 * 每次重启都会多跑一轮，读者跟着多收几封。events 的采集任务踩过同一个坑。
 */
import { runDigests } from "./digest.service.js";

import type { JobRegistryContext } from "@rewindom/module-sdk/server";

const INTERVAL_MS = 60 * 60 * 1000;
/** 启动后等一会儿：别和迁移、缓存预热抢那几秒。 */
const INITIAL_DELAY_MS = 2 * 60 * 1000;

export function registerNewsletterDigestJob(ctx: JobRegistryContext): void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let interval: ReturnType<typeof setInterval> | null = null;
  /** 一轮没跑完就到下一个周期时直接跳过，而不是让两轮叠在一起投同一批人。 */
  let running = false;

  const runOnce = async (): Promise<void> => {
    if (running) {
      ctx.app.log.warn("[newsletter] 上一轮摘要尚未结束，跳过本轮");
      return;
    }
    running = true;
    try {
      const summary = await runDigests(ctx.app, ctx.app.log);
      if (summary.sent > 0) {
        ctx.app.log.info({ ...summary }, "[newsletter] 摘要投递完成");
      }
    } catch (err) {
      ctx.app.log.error({ err }, "[newsletter] 摘要投递失败");
    } finally {
      running = false;
    }
  };

  ctx.registry.register({
    id: "newsletter-digest",
    moduleId: ctx.moduleId,
    label: "Newsletter digest",
    start: () => {
      timeout = setTimeout(() => void runOnce(), INITIAL_DELAY_MS);
      interval = setInterval(() => void runOnce(), INTERVAL_MS);
    },
    stop: () => {
      if (timeout) clearTimeout(timeout);
      if (interval) clearInterval(interval);
      timeout = null;
      interval = null;
    },
  });
}
