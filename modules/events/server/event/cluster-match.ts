import { shouldCluster, titleSimilarity } from "./title-tokens.js";

export interface ClusterCandidate {
  id: string;
  tokens: string[];
}

/**
 * 在候选事件里挑一个最像的。
 *
 * 「最像」而不是「第一个够像的」——候选按时间排，先遇到的未必最贴切，
 * 挑最高分能显著减少「同一件事被拆成两个事件」的情况。
 */
export function pickBestCluster(
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
