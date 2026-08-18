import { prisma, withTenantScope } from "@rewindom/module-sdk/server";

import { DEFAULT_FEEDS, feedCatalogKey } from "./feed-catalog.js";

/**
 * 「这个站点种过哪些目录项」的记录键（存 TenantSetting）。
 *
 * 以前的口径是「只在空目录时新建」：站点一旦配过源，目录就再也到不了它。
 * 后果是**扩充目录对所有存量站点完全无效**——线上那个站早就有源了。
 *
 * 改成按 key 记账后两件事同时成立：
 *   1. 目录新增的源能补给存量站点；
 *   2. 站点删掉 / 关掉的源不会被塞回来（它的 key 已经在记录里）。
 */
export const SEEDED_FEED_KEYS_SETTING = "events.seeded_feed_keys";

/**
 * 把该站点还没种过的目录项写进去。
 *
 * 每轮采集前调一次，幂等。
 */
export async function ensureDefaultFeeds(tenantId: string): Promise<number> {
  const seeded = await loadSeededKeys(tenantId);
  const pending = DEFAULT_FEEDS.filter(
    (feed) => !seeded.has(feedCatalogKey(feed)),
  );
  if (pending.length === 0) {
    return 0;
  }

  await prisma.eventFeed.createMany({
    data: pending.map((feed) => ({ ...feed, tenant_id: tenantId })),
    // 站点可能自己加过同一个地址（@@unique([tenant_id, url])）——静默跳过即可
    skipDuplicates: true,
  });

  await saveSeededKeys(tenantId, [
    ...seeded,
    ...pending.map((feed) => feedCatalogKey(feed)),
  ]);
  return pending.length;
}

/**
 * 读取该站点已种过的 key。
 *
 * **存量站点没有这条记录**。此时把它当前已有的每个源都视为「种过」，
 * 再补差集——否则会把它早就删掉的初版默认源全部复活。
 * 这是一次性升级，写在这里就够，不需要 migration。
 */
async function loadSeededKeys(tenantId: string): Promise<Set<string>> {
  const row = await prisma.tenantSetting.findFirst({
    where: withTenantScope(tenantId, { key: SEEDED_FEED_KEYS_SETTING }),
    select: { value: true },
  });

  const stored = parseKeys(row?.value);
  if (stored) {
    return stored;
  }

  const existing = await prisma.eventFeed.findMany({
    where: withTenantScope(tenantId),
    select: { connector: true, url: true },
  });
  return new Set(existing.map(feedCatalogKey));
}

function parseKeys(value: unknown): Set<string> | null {
  if (!Array.isArray(value)) {
    return null;
  }
  return new Set(value.filter((item): item is string => typeof item === "string"));
}

async function saveSeededKeys(
  tenantId: string,
  keys: readonly string[],
): Promise<void> {
  const value = [...new Set(keys)].sort();
  await prisma.tenantSetting.upsert({
    where: {
      tenant_id_key: { tenant_id: tenantId, key: SEEDED_FEED_KEYS_SETTING },
    },
    create: { tenant_id: tenantId, key: SEEDED_FEED_KEYS_SETTING, value },
    update: { value },
  });
}
