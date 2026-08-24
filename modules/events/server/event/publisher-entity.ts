/**
 * 出版方实体——「这条源发的事，是关于谁的」。
 *
 * 归位（`placement.service`）与累计档案（`entity-profile.service`）是这个模块
 * 对**单信号事件**唯一有效的增量，而它们都要求事件上有主实体。实体抽取刻意保守
 *（Title Case 整条弃权、句首要等印证），本地库量到的覆盖率：
 *
 *   release  8.3%   ← 最该有实体的一格，恰恰最差
 *   status   36.4%
 *   official 38.0%
 *
 * 但这批事件的实体**根本不用猜**：`Cloudflare Status` 的事件就是关于
 * Cloudflare 的。这不是从文本里推断，是采集源自己的身份，人工写在目录里
 *（`FeedSeed.publisher_entity`）、落在站点自己的 `EventFeed` 上。
 *
 * 三条边界：
 *
 * 1. **只对一手来源生效**。一篇 TechCrunch 报道不是「关于 TechCrunch」的。
 * 2. **不进聚类**。MODULE.md 记着「共享实体 + 语义阈值」在真实语料上是
 *    救回 0 对、误并 1 对；出版方实体让「同一家的两次不相干故障共享实体」
 *    更普遍，所以那条禁令在这之后更重要，不是更松。
 * 3. **与分析器解耦**。它是采集源的属性，不是分析器产物，所以 LLM 冷却期内
 *    也要保证关联在（见 `event-refresh` 里的两条分支）。
 */
import { prisma, withTenantScope } from "@rewindom/module-sdk/server";

import { isFirstPartySource } from "../../shared/index.js";

import {
  isEntityKind,
  type EntityKind,
  type ExtractedEntity,
} from "./entity-extractor.js";

import type { EventSourceKind } from "../../shared/index.js";

/** 解析出版方实体所需的信号最小形状。 */
export interface PublisherSignal {
  connector: string;
  source_name: string;
  source_kind: EventSourceKind;
}

/** `(connector, name)` → 该源标注的出版方实体。 */
export type PublisherFeedIndex = ReadonlyMap<
  string,
  { name: string; kind: EntityKind }
>;

function feedKey(connector: string, name: string): string {
  return `${connector} ${name}`;
}

/**
 * 该站点所有标了出版方的采集源，一次查回来。
 *
 * **按站点缓存，不是按事件**：一轮刷新有几百个事件，而这份表每站点只有一份
 * （与 `refreshEvents` 里的分析器、热度榜单同一条口径）。降温扫描每轮最多捞
 * 200 个事件，逐个查等于每轮多 200 次往返，只为一份完全相同的表。
 */
export async function loadPublisherFeedIndex(
  tenantId: string,
): Promise<PublisherFeedIndex> {
  const feeds = await prisma.eventFeed.findMany({
    where: withTenantScope(tenantId, { publisher_entity_name: { not: null } }),
    select: {
      connector: true,
      name: true,
      publisher_entity_name: true,
      publisher_entity_kind: true,
    },
  });

  const index = new Map<string, { name: string; kind: EntityKind }>();
  for (const feed of feeds) {
    const name = feed.publisher_entity_name?.trim();
    if (!name) {
      continue;
    }
    index.set(feedKey(feed.connector, feed.name), {
      name,
      // 类型脏了就当 org——与规则抽取分不出类型时的兜底同一格，不猜
      kind: isEntityKind(feed.publisher_entity_kind)
        ? feed.publisher_entity_kind
        : "org",
    });
  }
  return index;
}

/**
 * 这个事件的出版方实体。
 *
 * 纯函数——查询在 `loadPublisherFeedIndex` 里、按站点缓存。
 *
 * 解析走 `(connector, source_name)`——`source_name` 在采集时就是从 `feed.name`
 * 抄过去的，两者天然相等。**刻意不给 `EventSignal` 加 `feed_id`**：那要给
 * 十万级的信号表加列并回填，而代价只是「站点把源改名之后，旧信号解析不到」，
 * 新信号下一轮就带上新名字了。
 *
 * `mention_count` 记的是**这个出版方在本事件里贡献了几条信号**——一条真实的计数，
 * 与那一列「被提到几次」的语义同类。不为了让它排前面去编一个大数：
 * 排序靠 `is_publisher`，不靠注水的计数。
 */
export function resolvePublisherEntities(
  index: PublisherFeedIndex,
  signals: readonly PublisherSignal[],
): ExtractedEntity[] {
  const counts = new Map<string, ExtractedEntity>();
  for (const signal of signals) {
    if (!isFirstPartySource(signal.source_kind)) {
      continue;
    }
    const entity = index.get(feedKey(signal.connector, signal.source_name));
    if (!entity) {
      continue;
    }
    const key = `${entity.kind} ${entity.name.toLowerCase()}`;
    const existing = counts.get(key);
    if (existing) {
      existing.mention_count += 1;
      continue;
    }
    counts.set(key, { ...entity, mention_count: 1 });
  }
  return [...counts.values()];
}
