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
 * 同一条信号两次补抓之间至少隔多久。
 *
 * 没有这道退避时，抓不出摘录的 URL（付费墙、机器人墙、纯 JS 页）会**永远**
 * 留在候选里：失败不写任何东西，下一轮 `excerpt: ""` 仍然命中它，于是同一批
 * 40 个死链每 15 分钟被重抓一次，一天 96 遍，直到被更新的空摘录挤出窗口。
 *
 * 退避靠 `fetched_at`——每次尝试都把它推到当下，成功与否都推。这一列的语义
 * 就是「上次为这条信号发起网络请求的时间」，除了这里没有第二处读它。
 */
const BACKFILL_RETRY_HOURS = 6;

/**
 * 给库里还没有摘录的信号补目标页描述。
 *
 * 新抓到的信号在 persist 前就已经试过目标页；这里只补「当时失败 /
 * 上线前已入库」的旧行，避免同一轮对同一 URL 抓两次。
 * 成功写入后，还没有 LLM / 人工摘要的事件才把 `analyzed_at` 清掉，
 * 让 refresh 用新摘录重写规则摘要。已经付过钱的产出不置空——
 * 置空会绕过冷却再调一次模型。
 */
export async function enrichStoredEmptyExcerpts(
  tenantId: string,
  now: Date,
): Promise<string[]> {
  const retryBefore = new Date(
    now.getTime() - BACKFILL_RETRY_HOURS * 60 * 60 * 1000,
  );
  const rows = await prisma.eventSignal.findMany({
    where: withTenantScope(tenantId, {
      excerpt: "",
      fetched_at: { lt: retryBefore },
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
      let excerpt = "";
      try {
        excerpt = await fetchPageExcerpt(row.url);
      } catch {
        // 抓取失败也要往下走：那一笔时间正是失败要留的退避标记
      }
      const usable = isUsableExcerpt(excerpt, row.title);
      try {
        // 尝试过就记一笔时间：失败的那些靠它退避，不再每轮重抓
        await prisma.eventSignal.update({
          where: { id: row.id },
          data: { fetched_at: now, ...(usable ? { excerpt } : {}) },
        });
      } catch {
        // 行可能刚被保留期清理删掉。这一条跳过，不该让整轮补齐失败
        continue;
      }
      if (usable && row.event_id) {
        eventIds.add(row.event_id);
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
  await clearAnalysisForExcerptUpgrade(tenantId, ids);
  return ids;
}

/**
 * 摘录补齐后，只有还没付过模型费的事件才重跑分析。
 *
 * `analyzed_at = null` 会绕过 LLM 冷却。已经是 llm / manual 的摘要
 * 再拿规则产出或再调一次模型都是亏的：前者降级，后者重复付费。
 * 规则实现（heuristic）零成本，新摘录该立刻写进摘要。
 */
export async function clearAnalysisForExcerptUpgrade(
  tenantId: string,
  eventIds: readonly string[],
): Promise<void> {
  const ids = [...new Set(eventIds.filter((id) => id.length > 0))];
  if (ids.length === 0) {
    return;
  }
  await prisma.newsEvent.updateMany({
    where: withTenantScope(tenantId, {
      id: { in: ids },
      analyzer: { notIn: ["llm", "manual"] },
    }),
    data: { analyzed_at: null },
  });
}
