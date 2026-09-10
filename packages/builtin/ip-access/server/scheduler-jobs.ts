/**
 * 定时任务：清理过期规则 + 裁剪访问来源桶 + 刷新边缘层导出。
 *
 * 判定的正确性**不依赖**这些 job——快照本身就按 `expires_at` 过滤，
 * job 挂掉最多是库里堆着一批已经不生效的死行。
 *
 * 拆成三个注册项而不是一个：三件事失败的原因互不相干（库、Redis、文件系统），
 * 合成一个的话平台页只会看到「ip-access-maintenance 失败」，说不清是哪一件。
 */
import { config } from "@rewindom/server-kernel/lib/config.js";

import { flushRuleHits, purgeExpiredIpRules } from "./ip-access.service.js";
import { exportNginxBlocklist } from "./nginx-export.js";
import { trimTrafficBuckets } from "./traffic-stats.service.js";

import type { JobRegistryContext } from "@rewindom/server-kernel/runtime/job-registry.js";

const PURGE_INTERVAL_MS = 10 * 60 * 1000;
/** 裁剪要比桶的生成快得多，否则单个桶在被裁之前就能涨到几十万成员 */
const TRIM_INTERVAL_MS = 60 * 1000;
/** 边缘层名单靠写操作即时刷新，这里只是防止某次导出失败后一直不一致 */
const EXPORT_INTERVAL_MS = 30 * 60 * 1000;

export function registerIpAccessJobs(ctx: JobRegistryContext): void {
  ctx.registry.register({
    id: "ip-access-purge-expired",
    moduleId: "ip-access",
    label: "IP rule expiry purge",
    schedules: [{ kind: "interval", every_ms: PURGE_INTERVAL_MS }],
    run: () => purgeExpiredIpRules(),
    stop: () => {
      // 停机前把攒下的命中数落库，否则最后一个批次直接丢掉
      void flushRuleHits();
    },
  });

  if (config.ipAccess.trafficStats) {
    ctx.registry.register({
      id: "ip-access-traffic-trim",
      moduleId: "ip-access",
      label: "Traffic bucket trim",
      schedules: [{ kind: "interval", every_ms: TRIM_INTERVAL_MS }],
      run: () => trimTrafficBuckets(),
    });
  }

  if (config.ipAccess.nginxExportPath.trim() !== "") {
    ctx.registry.register({
      id: "ip-access-nginx-export",
      moduleId: "ip-access",
      label: "Edge blocklist export",
      schedules: [{ kind: "interval", every_ms: EXPORT_INTERVAL_MS }],
      run: () => exportNginxBlocklist(),
    });
  }
}
