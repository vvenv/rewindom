import { prisma, withTenantScope } from "@rewindom/module-sdk/server";

import {
  fetchPageExcerpt,
  isFetchableArticleUrl,
  isUsableExcerpt,
} from "./page-excerpt.js";

/** 每轮最多补多少条已入库的空摘录，避免一次 ingest 去抓全库。 */
const STORED_EXCERPT_BACKFILL_LIMIT = 40;
const BACKFILL_CONCURRENCY = 5;

/**
 * 给库里还没有摘录的信号补目标页描述。
 *
 * 本轮刚抓到的信号在 persist 前就已经试过目标页；这里只补「当时失败 /
 * 上线前已入库」的旧行，避免同一轮对同一 URL 抓两次。
 * 成功写入后把所属事件的 `analyzed_at` 清掉，refresh 才会用新摘录重写摘要。
 */
export async function enrichStoredEmptyExcerpts(
  tenantId: string,
  fetchedBefore: Date,
): Promise<string[]> {
  const rows = await prisma.eventSignal.findMany({
    where: withTenantScope(tenantId, {
      excerpt: "",
      fetched_at: { lt: fetchedBefore },
      // 移除过的信号不值得再花一次抓取去补摘录
      removed_at: null,
    }),
    select: { id: true, url: true, title: true, event_id: true },
    orderBy: { published_at: "desc" },
    take: STORED_EXCERPT_BACKFILL_LIMIT * 3,
  });

  const targets = rows
    .filter((row) => isFetchableArticleUrl(row.url))
    .slice(0, STORED_EXCERPT_BACKFILL_LIMIT);

  if (targets.length === 0) {
    return [];
  }

  const eventIds = new Set<string>();
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < targets.length) {
      const index = next;
      next += 1;
      const row = targets[index];
      try {
        const excerpt = await fetchPageExcerpt(row.url);
        if (!isUsableExcerpt(excerpt, row.title)) {
          continue;
        }
        await prisma.eventSignal.update({
          where: { id: row.id },
          data: { excerpt },
        });
        if (row.event_id) {
          eventIds.add(row.event_id);
        }
      } catch {
        // 单篇失败下一轮再试
      }
    }
  };

  await Promise.all(
    Array.from(
      { length: Math.min(BACKFILL_CONCURRENCY, targets.length) },
      () => worker(),
    ),
  );

  const ids = [...eventIds];
  if (ids.length > 0) {
    await prisma.newsEvent.updateMany({
      where: withTenantScope(tenantId, { id: { in: ids } }),
      data: { analyzed_at: null },
    });
  }
  return ids;
}
