/**
 * 源模板文案的识别与清除。
 *
 * `isUsableExcerpt` 只判两件事：非空、不等于标题。它看不见**模板文案**——
 * 同一个来源在几十条互不相干的信号上给出逐字相同的一段话。本地库量的：
 *
 *   Comments                                                   ×53  （Lobsters / HN）
 *   We're on a journey to advance and democratize artificial…  ×23  （Hugging Face 的站点简介）
 *   The European Central Bank (ECB) is the central bank of…    ×13  （ECB 的机构介绍）
 *   Please refer to CHANGELOG.md for details.                  ×9
 *
 * 它比空摘录更糟：空摘录会走目标页补齐那条路，而模板文案**看起来是内容**，
 * 于是补齐永远不会被触发，读者在「发生了什么」下面读到的是一句与这件事无关的话。
 *
 * 判据是纯计数、不推断语义，所以在规则路径上就成立——正好作用在那 98% 的
 * 单信号事件上（它们的摘要就是这段摘录）。
 */
import { prisma, withTenantScope } from "@rewindom/module-sdk/server";

import { clearAnalysisForExcerptUpgrade } from "./excerpt-enrichment.js";

/**
 * 同一来源逐字重复几次算模板。
 *
 * 取 3 而不是 2：两条相同的短摘录还可能是同一件事的两次发布（源换 URL 重发），
 * 那是身份键该处理的事。到第三条基本只剩「这就是个常量字符串」一种解释。
 */
export const BOILERPLATE_MIN_REPEATS = 3;

/**
 * 超过这个长度的重复不当模板。
 *
 * 长文本逐字相同几乎一定是同一篇文章被重复采集，那同样是身份键的活；
 * 而真正的模板文案（导航语、站点简介、「见 CHANGELOG」）都很短。
 */
export const MAX_BOILERPLATE_LENGTH = 400;

/** 每轮每站点最多处理多少组——清理是背景工作，不能把采集周期吃掉。 */
const MAX_GROUPS_PER_ROUND = 20;

/**
 * 判断一组「同来源、同摘录、出现 N 次」是不是模板文案。
 *
 * 纯函数，单测穷举。**刻意不用相似度**：真实的模板文案逐字相同（它就是一个
 * 常量），换成相似度会把「同一系列的两次发版说明」也吃掉，而那是真实内容。
 * 与聚类那边同一条——误判比漏判有害得多，宁可漏掉几条。
 */
export function isBoilerplateExcerpt(
  excerpt: string,
  repeats: number,
): boolean {
  const text = excerpt.trim();
  if (text.length === 0) {
    return false;
  }
  return (
    repeats >= BOILERPLATE_MIN_REPEATS && text.length <= MAX_BOILERPLATE_LENGTH
  );
}

/**
 * 清掉该站点语料里的模板摘录，返回受影响的事件 id。
 *
 * **只清空 `excerpt`，不动信号**：信号是证据，标题与 URL 照旧。清空之后它自然
 * 落进 `enrichStoredEmptyExcerpts` 的候选，去抓目标页拿真正的描述——
 * Lobsters 的「Comments」正好因此换成文章本身的 meta description。
 *
 * 新采进来的模板文案不在这一轮拦（persist 时还不知道它会重复几次），
 * 由下一轮的这次扫描接住：整体是一个至多滞后一轮的自纠环，不需要额外的缓存。
 */
export async function pruneBoilerplateExcerpts(
  tenantId: string,
): Promise<string[]> {
  const groups = await prisma.eventSignal.groupBy({
    by: ["source_name", "excerpt"],
    where: withTenantScope(tenantId, {
      removed_at: null,
      excerpt: { not: "" },
    }),
    _count: { _all: true },
    having: { excerpt: { _count: { gte: BOILERPLATE_MIN_REPEATS } } },
    orderBy: { _count: { excerpt: "desc" } },
    take: MAX_GROUPS_PER_ROUND,
  });

  const boilerplate = groups.filter((group) =>
    isBoilerplateExcerpt(group.excerpt, group._count._all),
  );
  if (boilerplate.length === 0) {
    return [];
  }

  // 一次 OR 查回全部受影响的行，不给每一组各发一次查询
  const or = boilerplate.map((group) => ({
    source_name: group.source_name,
    excerpt: group.excerpt,
  }));
  const rows = await prisma.eventSignal.findMany({
    where: withTenantScope(tenantId, { removed_at: null, OR: or }),
    select: { event_id: true },
  });

  await prisma.eventSignal.updateMany({
    where: withTenantScope(tenantId, { removed_at: null, OR: or }),
    data: { excerpt: "" },
  });

  const eventIds = [
    ...new Set(rows.flatMap((row) => (row.event_id ? [row.event_id] : []))),
  ];
  // 与摘录补齐同一条口径：只有还没付过模型费的事件才重写摘要
  await clearAnalysisForExcerptUpgrade(tenantId, eventIds);
  return eventIds;
}
