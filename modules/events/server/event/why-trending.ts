/**
 * Why it's trending —— 「这件事为什么现在在扩散」。
 *
 * 这是最容易做砸的一个功能：它天然诱导人去**解释**、去推断动机，
 * 而 MVP §11 的边界写得很死——不给建议、不做预测、不判断谁对、不引入来源外的事实。
 *
 * 所以这里**只陈述可核对的事实**，而且产出的是 **i18n code + 参数**，不是自由文案。
 * 理由和「时间线不由模型给时间戳」完全一样：一旦允许自由文案，就会出现
 * 「因为开发者社区普遍担忧」这种看似合理、实则没有出处的句子。
 *
 * 纯函数：不落库、不调模型。它是「事件字段 + 信号集合」的函数，算出来就行。
 */
import { HEAT_WINDOW_HOURS } from "./heat.js";

import { isFirstPartySource } from "../../shared/index.js";

import type { EventSourceKind } from "../../shared/index.js";

/**
 * 事实的可信级别。**这条区分是整个功能存在的理由**——
 * 混为一谈就变成了「热度解释器」，那正是产品要避免的东西。
 */
export type TrendingConfidence = "confirmed" | "discussion";

export interface TrendingFactor {
  /** i18n code，客户端 / SSR 各自按 events ns 解析 */
  code: string;
  params: Record<string, string | number>;
  confidence: TrendingConfidence;
}

export interface WhyTrendingSignal {
  source_name: string;
  source_kind: EventSourceKind;
  published_at: Date;
}

/** 最多给几条。再多就不是「为什么」而是一份报表了。 */
const MAX_FACTORS = 4;

export function computeWhyTrending(params: {
  signals: readonly WhyTrendingSignal[];
  now: Date;
}): TrendingFactor[] {
  const { signals, now } = params;
  if (signals.length === 0) {
    return [];
  }

  const sorted = [...signals].sort(
    (a, b) => a.published_at.getTime() - b.published_at.getTime(),
  );
  const sourceNames = new Set(sorted.map((s) => s.source_name));
  const officials = sorted.filter((s) => isFirstPartySource(s.source_kind));
  const communityOnly = sorted.every((s) => s.source_kind === "community");

  /*
   * confirmed 的判据只有两条，都可核对：
   *   1. 有一手来源（当事方自己说的）
   *   2. ≥2 个不同来源在报同一件事（跨源印证）
   * 只有社区来源时一律是 discussion —— **哪怕十条 HN 帖子也仍然只是讨论**。
   */
  const confidence: TrendingConfidence =
    officials.length > 0 || (sourceNames.size >= 2 && !communityOnly)
      ? "confirmed"
      : "discussion";

  const factors: TrendingFactor[] = [];

  // 1. 一手来源发布了公告——最强的一条，放最前
  if (officials.length > 0) {
    factors.push({
      code: "why.officialAnnouncement",
      params: { source: officials[0].source_name },
      confidence: "confirmed",
    });
  }

  // 2. 跨源印证：几家在报，以及最先报的那家
  if (sourceNames.size >= 2) {
    factors.push({
      code: "why.crossSource",
      params: { count: sourceNames.size, first: sorted[0].source_name },
      confidence,
    });
  }

  /*
   * 3. 近窗新增量——「正在扩散」的可核对度量。
   *
   * 要求 ≥2 条：一条信号不是「活动」，那就是这个事件本身。
   * 对一条一手公告说「最近 6 小时新增 1 条」是同一件事说两遍。
   */
  const windowStart = now.getTime() - HEAT_WINDOW_HOURS * 60 * 60 * 1000;
  const recent = sorted.filter((s) => s.published_at.getTime() > windowStart);
  if (recent.length >= 2) {
    factors.push({
      code: "why.recentActivity",
      params: {
        count: recent.length,
        hours: HEAT_WINDOW_HOURS,
        sources: new Set(recent.map((s) => s.source_name)).size,
      },
      confidence,
    });
  }

  /*
   * 4. 只有社区在聊——**必须说出来**，否则读者会把讨论热度当成事情本身。
   *
   * 单条社区信号也要说。曾经把它一起压掉（理由是「一条信号没什么可讲」），
   * 但真实语料上量过：整个语料里**没有一个**纯社区来源的多信号事件——
   * HN 帖子之间极少聚到一起，所以压掉单条就等于这条警示永远不出现，
   * 而线上首页 16 张卡有 13 张正是单来源 HN。最该提醒的地方反而没提醒。
   */
  if (communityOnly) {
    factors.push({
      code: "why.communityOnly",
      params: { count: sorted.length },
      confidence: "discussion",
    });
  }

  // 一条事实都凑不出来就留白——比如单独一篇新闻稿，没什么「扩散」可讲
  return factors.slice(0, MAX_FACTORS);
}
