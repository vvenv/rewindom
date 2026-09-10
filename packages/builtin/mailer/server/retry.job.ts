/**
 * 重试任务：扫到期的 queued 投递，按指数退避再发一次。
 *
 * 节奏定在一分钟一轮，与最短那档退避对齐——再密也没有更快的重试可做，
 * 只会空扫。一轮没跑完就到下一个周期时由注册表跳过，而不是让两轮叠在一起
 * 抢同一批记录（events 的采集任务踩过这个，同一条口径）。
 */
import { closeSmtpTransports } from "./drivers/smtp.driver.js";
import { retryDueDeliveries } from "./mail.service.js";

import type { JobRegistryContext } from "@rewindom/server-kernel/runtime/job-registry.js";

const INTERVAL_MS = 60_000;
/** 启动后先让迁移和缓存预热跑完，别和它们抢那几秒。 */
const INITIAL_DELAY_MS = 30_000;

export function registerMailerRetryJob(ctx: JobRegistryContext): void {
  ctx.registry.register({
    id: "mailer-retry",
    moduleId: ctx.moduleId,
    label: "Mail delivery retry",
    schedules: [
      {
        kind: "interval",
        every_ms: INTERVAL_MS,
        initial_delay_ms: INITIAL_DELAY_MS,
        // 预热等完就先扫一轮，不要再空等一个周期
        run_on_start: true,
      },
    ],
    run: async () => {
      const summary = await retryDueDeliveries(ctx.app.log);
      if (summary.retried > 0 || summary.dropped > 0) {
        ctx.app.log.info({ ...summary }, "[mailer] 重试完成");
      }
    },
    stop: () => {
      // SMTP 连接池吊着会挡住优雅停机
      closeSmtpTransports();
    },
  });
}
