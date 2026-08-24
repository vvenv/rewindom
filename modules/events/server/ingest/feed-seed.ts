import { prisma, withTenantScope } from "@rewindom/module-sdk/server";

import { getEnabledTopics } from "../event/topic-settings.service.js";
import { isTopicEnabled } from "../../shared/index.js";

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
  const [seeded, enabled] = await Promise.all([
    loadSeededKeys(tenantId),
    getEnabledTopics(tenantId),
  ]);
  const pending = DEFAULT_FEEDS.filter(
    (feed) =>
      isTopicEnabled(enabled, feed.topic) && !seeded.has(feedCatalogKey(feed)),
  );

  // 目录新增 publisher_entity 之前种下的源没有这两列，补一次（与新增源无关）
  await backfillPublisherEntities(tenantId);

  if (pending.length === 0) {
    return 0;
  }

  await prisma.eventFeed.createMany({
    data: pending.map(({ publisher_entity, ...feed }) => ({
      ...feed,
      tenant_id: tenantId,
      publisher_entity_name: publisher_entity?.name ?? null,
      publisher_entity_kind: publisher_entity?.kind ?? null,
    })),
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

/**
 * 给已经种下、但还没有出版方实体的目录源补上这两列。
 *
 * 种植是按 key 记账的（种过就不再种），所以目录后来加的字段**到不了存量站点**
 * ——与当初「只在空目录时新建」那条一样，是同一类失效，只是粒度从整条源变成了
 * 一个字段。
 *
 * 只补 `publisher_entity_name` 为空的行：站点自己改过的不覆盖（那是它的数据），
 * 幂等，每轮采集前跑一次开销是一条 updateMany 乘以有标注的目录项。
 */
async function backfillPublisherEntities(tenantId: string): Promise<void> {
  /*
   * 先一条查询问「还有没有缺这两列的源」。绝大多数轮次这里是空的，
   * 于是整件事的常态开销就是这一条查询——不要按目录逐项发 updateMany，
   * 那是每轮每站点 159 次写查询，只为一件一次性的事。
   */
  const missing = await prisma.eventFeed.findMany({
    where: withTenantScope(tenantId, { publisher_entity_name: null }),
    select: { id: true, connector: true, url: true },
  });
  if (missing.length === 0) {
    return;
  }

  const catalog = new Map(
    DEFAULT_FEEDS.filter((feed) => feed.publisher_entity).map((feed) => [
      feedCatalogKey(feed),
      feed.publisher_entity!,
    ]),
  );
  for (const feed of missing) {
    const entity = catalog.get(feedCatalogKey(feed));
    if (!entity) {
      // 站点自己加的源——出版方由它自己在工作台填，目录不替它决定
      continue;
    }
    await prisma.eventFeed.update({
      where: { id: feed.id },
      data: {
        publisher_entity_name: entity.name,
        publisher_entity_kind: entity.kind,
      },
    });
  }
}

function parseKeys(value: unknown): Set<string> | null {
  if (!Array.isArray(value)) {
    return null;
  }
  return new Set(
    value.filter((item): item is string => typeof item === "string"),
  );
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
