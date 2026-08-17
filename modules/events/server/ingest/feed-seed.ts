import { prisma, withTenantScope } from "@rewindom/module-sdk/server";

import { DEFAULT_FEEDS } from "./feed-catalog.js";

/**
 * 内置目录只在该站点还没有任何采集源时写入。
 *
 * 已经配过源（含全部关掉、或删掉默认源只留自己的 RSS）就不再塞回来——
 * 否则「各站点自管采集源」会在下一轮采集被目录覆盖。
 */
export async function ensureDefaultFeeds(tenantId: string): Promise<void> {
  const count = await prisma.eventFeed.count({
    where: withTenantScope(tenantId),
  });
  if (count > 0) {
    return;
  }
  await prisma.eventFeed.createMany({
    data: DEFAULT_FEEDS.map((feed) => ({ ...feed, tenant_id: tenantId })),
    skipDuplicates: true,
  });
}
