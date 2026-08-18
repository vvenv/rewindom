/**
 * Related Events —— 「这件事还牵着哪些事」。
 *
 * 与聚类同源、只是阈值更低：聚类回答「这是不是同一件事」（0.85），
 * 相关回答「这两件事有没有关系」（0.75）。输入是同一个 `NewsEvent.centroid`。
 *
 * **预计算**，不在读路径上算：详情页每次都载入候选事件的全部向量的话，
 * 400 个事件 × 1536 维 float8 ≈ 4.9MB/请求，公开面 SSR 承受不起。
 */
import { prisma, withTenantScope } from "@rewindom/module-sdk/server";

import { cosineSimilarity } from "./embedding.js";

/**
 * 相关的下限。
 *
 * **在真实语料上量过，别凭感觉调**（与 CLUSTER_SEMANTIC_THRESHOLD 同规矩）。
 * 单站点 400 个带向量的事件，人工判读 0.70~0.85 两段样本：
 *
 *   0.75~0.85 是真相关：
 *     0.8465  WHO 与瑞士签署合作 ⟷ WHO 与荷兰深化伙伴关系
 *     0.8417  Llamafile v0.8.14 发布 ⟷ Llamafile 四个月进展
 *     0.8411  Chrome 刷新 Speedometer 记录 ⟷ Core Web Vitals 节省的等待时间
 *   0.70~0.75 开始出噪声：
 *     0.7496  Firefox 加固 ⟷ Llamafile 发版（只是都属于开源工具）
 *     0.7494  Cloudflare 办公方式 ⟷ AlphaEvolve（不同公司、不同主题）
 */
export const RELATED_MIN_SIMILARITY = 0.75;
/** 详情页放得下的条数。再多就该是一个列表页，而详情页不是列表页。 */
export const RELATED_LIMIT = 5;
/**
 * 候选窗口：只在最近这段时间里找相关。
 *
 * 比聚类窗口（72h）宽得多——相关本来就该跨越更长的时间跨度
 *（「Llamafile 四个月进展」与「v0.8.14 发布」正是隔了几个月）；
 * 但也不能全表，否则三年前的事件会永远挂在首页事件的相关里。
 */
const CANDIDATE_WINDOW_DAYS = 30;
const CANDIDATE_LIMIT = 600;

export interface RelatedCandidate {
  id: string;
  centroid: number[];
}

/** 纯函数，便于在没有库的情况下钉住排序与阈值。 */
export function pickRelated(
  eventId: string,
  centroid: readonly number[],
  candidates: readonly RelatedCandidate[],
): string[] {
  if (centroid.length === 0) {
    return [];
  }

  const scored: { id: string; score: number }[] = [];
  for (const candidate of candidates) {
    // 自己永远不是自己的相关事件
    if (candidate.id === eventId) {
      continue;
    }
    const score = cosineSimilarity(centroid, candidate.centroid);
    if (score >= RELATED_MIN_SIMILARITY) {
      scored.push({ id: candidate.id, score });
    }
  }

  return scored
    // 同分时按 id 排，保证同样的输入得到同样的输出（幂等）
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, RELATED_LIMIT)
    .map((row) => row.id);
}

/**
 * 给一批事件重算相关列表。
 *
 * 候选**整批载入一次**，不塞进按事件的循环——那会把同一份几 MB 的向量重复读几十遍。
 * 所以这一趟放在 `refreshEvents` 之后单独跑，而不是并进去。
 */
export async function syncRelatedEvents(params: {
  tenant_id: string;
  event_ids: readonly string[];
}): Promise<number> {
  if (params.event_ids.length === 0) {
    return 0;
  }

  const cutoff = new Date(
    Date.now() - CANDIDATE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );
  const candidates = await prisma.newsEvent.findMany({
    where: withTenantScope(params.tenant_id, {
      last_activity_at: { gte: cutoff },
      NOT: { centroid: { isEmpty: true } },
    }),
    orderBy: { last_activity_at: "desc" },
    take: CANDIDATE_LIMIT,
    select: { id: true, centroid: true },
  });

  // 没配 embedding key 时一个候选都没有——整块功能静默为空，与没有这一层时一致
  if (candidates.length === 0) {
    return 0;
  }

  const byId = new Map(candidates.map((row) => [row.id, row]));
  let updated = 0;

  for (const eventId of new Set(params.event_ids)) {
    const self = byId.get(eventId);
    if (!self) {
      continue;
    }
    const related = pickRelated(eventId, self.centroid, candidates);
    await prisma.newsEvent.update({
      where: { id: eventId },
      data: { related_event_ids: related },
    });
    updated += 1;
  }

  return updated;
}

/** 相关事件的读取：预计算过了，这里只是按 id 取回。 */
export async function listRelatedEvents(params: {
  tenant_id: string;
  related_ids: readonly string[];
}) {
  if (params.related_ids.length === 0) {
    return [];
  }
  const rows = await prisma.newsEvent.findMany({
    where: withTenantScope(params.tenant_id, { id: { in: [...params.related_ids] } }),
    select: {
      id: true,
      slug: true,
      title: true,
      topic: true,
      status: true,
      last_activity_at: true,
    },
  });
  // 保持预计算时的相似度顺序——findMany 不保证顺序
  const byId = new Map(rows.map((row) => [row.id, row]));
  return params.related_ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
}
