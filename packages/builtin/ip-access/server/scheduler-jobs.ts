/**
 * 定时任务：清理过期规则 + 刷新边缘层导出。
 *
 * 判定的正确性**不依赖**这个 job——快照本身就按 `expires_at` 过滤，
 * job 挂掉最多是库里堆着一批已经不生效的死行。
 */
import { config } from "@rewindom/server-kernel/lib/config.js";

import { purgeExpiredIpRules } from "./ip-access.service.js";
import { exportNginxBlocklist } from "./nginx-export.js";
import { trimTrafficBuckets } from "./traffic-stats.service.js";

import type { JobRegistryContext } from "@rewindom/server-kernel/runtime/job-registry.js";

const PURGE_INTERVAL_MS = 10 * 60 * 1000;
/** 裁剪要比桶的生成快得多，否则单个桶在被裁之前就能涨到几十万成员 */
const TRIM_INTERVAL_MS = 60 * 1000;
/** 边缘层名单靠写操作即时刷新，这里只是防止某次导出失败后一直不一致 */
const EXPORT_INTERVAL_MS = 30 * 60 * 1000;

export function registerIpAccessJobs(ctx: JobRegistryContext): void {
  const intervals: ReturnType<typeof setInterval>[] = [];

  ctx.registry.register({
    id: "ip-access-maintenance",
    moduleId: "ip-access",
    label: "IP rule expiry + edge export",
    start: () => {
      intervals.push(
        setInterval(() => {
          void purgeExpiredIpRules().catch((err: unknown) => {
            ctx.app.log.error({ err }, "[scheduler] 过期 IP 规则清理失败");
          });
        }, PURGE_INTERVAL_MS),
      );

      if (config.ipAccess.trafficStats) {
        intervals.push(
          setInterval(() => {
            void trimTrafficBuckets().catch((err: unknown) => {
              ctx.app.log.error({ err }, "[scheduler] 访问来源统计裁剪失败");
            });
          }, TRIM_INTERVAL_MS),
        );
      }

      if (config.ipAccess.nginxExportPath.trim() !== "") {
        intervals.push(
          setInterval(() => {
            void exportNginxBlocklist().catch((err: unknown) => {
              ctx.app.log.error({ err }, "[scheduler] nginx 封禁名单导出失败");
            });
          }, EXPORT_INTERVAL_MS),
        );
      }
    },
    stop: () => {
      for (const id of intervals) clearInterval(id);
      intervals.length = 0;
    },
  });
}
