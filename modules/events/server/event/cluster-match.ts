import { cosineSimilarity } from "./embedding.js";
import { shouldCluster, titleSimilarity } from "./title-tokens.js";

export interface ClusterCandidate {
  id: string;
  tokens: string[];
  /** 成员信号 embedding 的均值；空数组 = 该事件还没有向量 */
  centroid: number[];
}

/**
 * 语义合并阈值。
 *
 * **在真实语料上校准过，别凭感觉调**（与 CLUSTER_SIMILARITY_THRESHOLD 同规矩）。
 * 单站点 72h 窗口 194 个事件，人工判读全部 ≥0.78 的事件对：
 *
 *   0.9580  Uber/Zipline 无人机送餐            ✓ 同一件事
 *   0.9379  Stripe 收购 OpenRouter             ✓ 同一件事（词面同分 0.33，判不出来）
 *   0.8930  Amazon 销毁珍本书训练 AI            ✓ 同一件事
 *   0.8597  Hayden Panettiere 去世             ✓ 同一件事（一条把名字拼错了）
 *   0.8537  印尼地震救援                        ✓ 同一件事
 *   0.8523  GitHub 故障                        ✓ 同一件事
 *   ---- 0.85 ----
 *   0.8447  GitHub Copilot 两篇教程             ✗ 不同事件（MODULE.md 的反例）
 *   0.8366  两条无关的 HN AI 讨论               ✗ 不同事件
 *
 * 分离区间是 [0.8366, 0.8523]，0.85 落在里面：6 对正确合并、0 对误合并。
 * 误合并比漏合并有害得多——把两件事说成一件会直接毁掉事件页的可信度，
 * 漏合并只是多留一张卡片。所以阈值取在区间偏上。
 */
export const CLUSTER_SEMANTIC_THRESHOLD = 0.85;

/**
 * 在候选事件里挑一个最像的。
 *
 * 「最像」而不是「第一个够像的」——候选按时间排，先遇到的未必最贴切，
 * 挑最高分能显著减少「同一件事被拆成两个事件」的情况。
 *
 * 两条判据是**或**关系，词面优先：它零成本、零网络依赖，且从未误判过。
 * 语义只负责接住词面够不着的那些（措辞不同、拼写错误、跨语言）。
 */
export function pickBestCluster(
  tokens: readonly string[],
  embedding: readonly number[],
  candidates: readonly ClusterCandidate[],
): string | null {
  return (
    pickBestLexicalCluster(tokens, candidates) ??
    pickBestSemanticCluster(embedding, candidates)
  );
}

export function pickBestLexicalCluster(
  tokens: readonly string[],
  candidates: readonly ClusterCandidate[],
): string | null {
  let best: { id: string; score: number } | null = null;

  for (const candidate of candidates) {
    if (!shouldCluster([...tokens], candidate.tokens)) {
      continue;
    }
    const score = titleSimilarity([...tokens], candidate.tokens);
    if (best === null || score > best.score) {
      best = { id: candidate.id, score };
    }
  }

  return best?.id ?? null;
}

export function pickBestSemanticCluster(
  embedding: readonly number[],
  candidates: readonly ClusterCandidate[],
): string | null {
  if (embedding.length === 0) {
    return null;
  }

  let best: { id: string; score: number } | null = null;
  for (const candidate of candidates) {
    const score = cosineSimilarity(embedding, candidate.centroid);
    if (score < CLUSTER_SEMANTIC_THRESHOLD) {
      continue;
    }
    if (best === null || score > best.score) {
      best = { id: candidate.id, score };
    }
  }

  return best?.id ?? null;
}
