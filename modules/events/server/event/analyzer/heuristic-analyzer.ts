import { pickEventTitle, titleSimilarity, tokenizeTitle } from "../title-tokens.js";
import { isUsableExcerpt } from "../../ingest/page-excerpt.js";
import { isFirstPartySource } from "../../../shared/index.js";

import type {
  AnalyzedEvent,
  AnalyzedTimelineEntry,
  AnalyzerInput,
  AnalyzerSignal,
  EventAnalyzer,
} from "./analyzer.js";
import type { EventSourceKind } from "../../../shared/index.js";

/** 摘要长度上限——详情页要 3~5 句话读完，不是把原文搬过来。 */
const SUMMARY_MAX_LENGTH = 420;

/** 一个事件的时间线最多几格：再多用户就不看了，且信息密度反而下降。 */
const TIMELINE_MAX_ENTRIES = 12;

/**
 * 通稿回声的标题相似度。高于聚类阈值 0.4：这些信号已经在同一事件里，
 * 0.4 会把跟进报道也吃掉。0.75 只挡「同一份通稿换个出处」。
 */
const WIRE_ECHO_SIMILARITY = 0.75;

/** 一手来源在前——非新闻源同样是当事方自己发布的，与 official 同档。 */
const SOURCE_PRIORITY: Record<EventSourceKind, number> = {
  official: 0,
  release: 0,
  status: 0,
  filing: 0,
  news: 1,
  community: 2,
};

/**
 * 规则分析器——不调用任何模型。
 *
 * 它做的是「组织」而不是「生成」：标题从候选里挑一条，摘要取一手来源的原文摘录，
 * 时间线由信号时间戳重建并折叠通稿回声。因此它永远不会说出一句没有出处的话，
 * 代价是文笔平淡——这正是 MVP 阶段愿意付的代价。
 */
export const heuristicAnalyzer: EventAnalyzer = {
  id: "heuristic",
  analyze: (input: AnalyzerInput): Promise<AnalyzedEvent> =>
    Promise.resolve({
      title: pickEventTitle(input.signals.map((signal) => signal.title)),
      summary: buildSummary(input.signals),
      timeline: buildTimeline(input.signals),
    }),
};

/**
 * 摘要 = 最可信来源的原文摘录。优先级 official → news → community，
 * 同级取最早的一条（第一手发布通常最完整）。摘录与标题相同的不算。
 * 都没有可用摘录时留空，由界面显示「暂无摘要」而不是硬凑一句。
 */
function buildSummary(signals: readonly AnalyzerSignal[]): string {
  const withExcerpt = signals.filter((signal) =>
    isUsableExcerpt(signal.excerpt, signal.title),
  );
  if (withExcerpt.length === 0) {
    return "";
  }

  const best = [...withExcerpt].sort(
    (a, b) =>
      SOURCE_PRIORITY[a.source_kind] - SOURCE_PRIORITY[b.source_kind] ||
      a.published_at.getTime() - b.published_at.getTime(),
  )[0];

  return truncate(best.excerpt.trim(), SUMMARY_MAX_LENGTH);
}

/**
 * 时间线 = 按时间排好的信号，每条给一个稳定 code。
 * 同一来源重复出现时降级为「补充」；后到的新闻若标题几乎等于已保留的
 * 新闻 / 一手来源，视为通稿回声，不占格（证据仍在来源列表里）。
 */
function buildTimeline(
  signals: readonly AnalyzerSignal[],
): AnalyzedTimelineEntry[] {
  const ordered = [...signals].sort(
    (a, b) => a.published_at.getTime() - b.published_at.getTime(),
  );

  const seenSources = new Set<string>();
  const kept: AnalyzerSignal[] = [];
  const entries: AnalyzedTimelineEntry[] = [];

  for (const signal of ordered) {
    if (isNewsWireEcho(signal, kept)) {
      continue;
    }
    const repeated = seenSources.has(signal.source_name);
    seenSources.add(signal.source_name);
    kept.push(signal);

    entries.push({
      occurred_at: signal.published_at,
      label_code: resolveLabelCode(
        signal.source_kind,
        entries.length === 0,
        repeated,
      ),
      label_text: null,
      source_kind: signal.source_kind,
      source_name: signal.source_name,
      signal_id: signal.signal_id,
      url: signal.url,
    });
  }

  // 超长时保头保尾：开端与最新进展是用户最需要的两格
  if (entries.length <= TIMELINE_MAX_ENTRIES) {
    return entries;
  }
  const head = Math.ceil(TIMELINE_MAX_ENTRIES / 2);
  const tail = TIMELINE_MAX_ENTRIES - head;
  return [...entries.slice(0, head), ...entries.slice(-tail)];
}

/**
 * 只有 news 才按标题折叠。community 是讨论、一手来源是当事方更新，
 * 即使标题像，也是真的进展。
 */
function isNewsWireEcho(
  signal: AnalyzerSignal,
  kept: readonly AnalyzerSignal[],
): boolean {
  if (signal.source_kind !== "news" || kept.length === 0) {
    return false;
  }
  const tokens = tokenizeTitle(signal.title);
  return kept.some((prior) => {
    if (prior.source_kind !== "news" && !isFirstPartySource(prior.source_kind)) {
      return false;
    }
    return (
      titleSimilarity(tokens, tokenizeTitle(prior.title)) >= WIRE_ECHO_SIMILARITY
    );
  });
}

function resolveLabelCode(
  sourceKind: EventSourceKind,
  isFirst: boolean,
  repeated: boolean,
): string {
  if (isFirst) {
    return "timeline.firstSeen";
  }
  if (repeated) {
    return isFirstPartySource(sourceKind)
      ? "timeline.officialUpdate"
      : "timeline.moreCoverage";
  }
  return `timeline.${sourceKind}`;
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}
