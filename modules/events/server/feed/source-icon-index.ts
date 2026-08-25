import { prisma, withTenantScope } from "@rewindom/module-sdk/server";

import { normalizeEntityName } from "../event/entity-extractor.js";

import {
  bindSourceIconUrl,
  buildSourceIconIndex,
  sourceIconUrl,
} from "../../shared/source-icon.js";

/**
 * 一次查询同时给出两张索引。
 *
 * 实体页两张都要（名片上的标志 + 卡片上的来源标），所以**不**为实体页再开一次
 * EventFeed 全表扫描——那张表已经在这里被完整读了一遍，多 select 一列而已。
 */
export interface EventsIconIndex {
  /** 采集源 name → favicon URL */
  sources: ReadonlyMap<string, string>;
  /** 归一后的出版方实体名 → favicon URL */
  entities: ReadonlyMap<string, string>;
}

/** 本站采集源 name → favicon URL。每请求一次，~70 行。 */
export async function loadSourceIconIndex(
  tenantId: string,
  tenantSlug?: string | null,
): Promise<ReadonlyMap<string, string>> {
  return (await loadEventsIconIndex(tenantId, tenantSlug)).sources;
}

export async function loadEventsIconIndex(
  tenantId: string,
  tenantSlug?: string | null,
): Promise<EventsIconIndex> {
  const rows = await prisma.eventFeed.findMany({
    where: withTenantScope(tenantId),
    select: {
      name: true,
      url: true,
      connector: true,
      publisher_entity_name: true,
    },
  });
  const toUrl = bindSourceIconUrl(tenantSlug);
  return {
    sources: buildSourceIconIndex(rows, toUrl),
    entities: buildEntityIconIndex(rows, toUrl),
  };
}

/**
 * 出版方实体 → 它那条源的 favicon。
 *
 * 覆盖率**刻意有限**：只有被某条一手来源标成出版方的实体拿得到标志
 *（`publisher_entity_name`，人工填在目录里的策展知识）。抽取出来的实体不去猜域名
 * ——「Kubernetes → kubernetes.io」在目录里是知识，在代码里就是猜，与 MODULE.md
 * 「不做别名合并，猜错比不合并更糟」同一条原则。
 *
 * 一个实体可能是多条源的出版方（`status.openai.com` 与 `openai.com/blog` 都标 OpenAI）。
 * 别名表归一后大概率是同一个 host；真不同就按 feed.name 字典序取第一条——
 * 要的是**稳定**，不是最优：每次刷新换一张图比一直用次优的那张糟得多。
 */
export function buildEntityIconIndex(
  feeds: readonly {
    name: string;
    url: string;
    connector: string;
    publisher_entity_name: string | null;
  }[],
  toUrl?: (host: string) => string,
): Map<string, string> {
  const map = new Map<string, string>();
  const chosen = new Map<string, string>();
  for (const feed of [...feeds].sort((a, b) => a.name.localeCompare(b.name))) {
    const publisher = feed.publisher_entity_name?.trim();
    if (!publisher) {
      continue;
    }
    const key = normalizeEntityName(publisher);
    if (chosen.has(key)) {
      continue;
    }
    const url = sourceIconUrl(feed, toUrl);
    if (url) {
      chosen.set(key, feed.name);
      map.set(key, url);
    }
  }
  return map;
}
