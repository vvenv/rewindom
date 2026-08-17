import { prisma } from "@rewindom/module-sdk/server";

import { analyzeEvent, resolveEventAnalyzer } from "./analyzer/index.js";
import { computeHeat, resolveStatus, type HeatSignal } from "./heat.js";
import { pickEventTitle } from "./title-tokens.js";

import type { AnalyzerSignal, EventAnalyzer } from "./analyzer/index.js";
import type { EventSourceKind, EventTopic } from "../../shared/index.js";

/**
 * LLM 重分析冷却期。规则分析器几乎零成本、每次都重算；
 * 走 LLM 时一个热门事件几分钟就能来十几条信号，不加冷却等于按信号数计费。
 */
const LLM_REANALYZE_COOLDOWN_MS = 30 * 60 * 1000;

/** 卡片上最多展示几个来源名。 */
const SOURCE_NAME_LIMIT = 8;

export interface RefreshEventsOptions {
  now?: Date;
  onAnalyzerFallback?: (eventId: string, err: unknown) => void;
}

/**
 * 重算事件的派生状态：热度、增速、阶段、计数、摘要与时间线。
 *
 * 采集之后、以及定时降温扫描都会调它。刻意做成幂等——同样的信号集合重跑
 * 得到同样的结果，出问题时可以放心重跑。
 */
export async function refreshEvents(
  eventIds: Iterable<string>,
  options: RefreshEventsOptions = {},
): Promise<number> {
  const now = options.now ?? new Date();
  let refreshed = 0;
  const analyzers = new Map<string, Promise<EventAnalyzer>>();
  const analyzerFor = (tenantId: string): Promise<EventAnalyzer> => {
    let pending = analyzers.get(tenantId);
    if (!pending) {
      pending = resolveEventAnalyzer(tenantId);
      analyzers.set(tenantId, pending);
    }
    return pending;
  };

  for (const eventId of new Set(eventIds)) {
    const changed = await refreshEvent(eventId, now, options, analyzerFor);
    if (changed) {
      refreshed += 1;
    }
  }

  return refreshed;
}

async function refreshEvent(
  eventId: string,
  now: Date,
  options: RefreshEventsOptions,
  analyzerFor: (tenantId: string) => Promise<EventAnalyzer>,
): Promise<boolean> {
  const event = await prisma.newsEvent.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      tenant_id: true,
      topic: true,
      title: true,
      summary: true,
      analyzer: true,
      analyzed_at: true,
      manual_content: true,
    },
  });
  if (!event) {
    return false;
  }

  const signals = await prisma.eventSignal.findMany({
    where: { event_id: eventId },
    orderBy: { published_at: "asc" },
    select: {
      id: true,
      title: true,
      url: true,
      excerpt: true,
      source_name: true,
      source_kind: true,
      score: true,
      comment_count: true,
      published_at: true,
    },
  });

  if (signals.length === 0) {
    // 事件的信号被清空（保留期清理）后留着一个空壳没有意义
    await prisma.newsEvent.delete({ where: { id: eventId } });
    return true;
  }

  const heatSignals: HeatSignal[] = signals.map((signal) => ({
    published_at: signal.published_at,
    score: signal.score,
    comment_count: signal.comment_count,
    source_kind: signal.source_kind as EventSourceKind,
  }));

  const { heat_score, velocity_pct } = computeHeat(heatSignals, now);
  const firstSeenAt = signals[0].published_at;
  const lastActivityAt = signals[signals.length - 1].published_at;
  const status = resolveStatus({
    last_activity_at: lastActivityAt,
    velocity_pct,
    now,
  });

  const sourceNames = [
    ...new Set(signals.map((signal) => signal.source_name)),
  ].slice(0, SOURCE_NAME_LIMIT);

  const analyzer = await analyzerFor(event.tenant_id);
  const analysis = shouldReanalyze(event.analyzed_at, now, analyzer.id)
    ? await analyzeEvent(
        {
          topic: event.topic as EventTopic,
          signals: signals.map(toAnalyzerSignal),
        },
        analyzer,
        (err) => options.onAnalyzerFallback?.(eventId, err),
      )
    : null;

  const content = analysis
    ? resolveRefreshedContent({
        manual_content: event.manual_content,
        existing_title: event.title,
        existing_summary: event.summary,
        existing_analyzer: event.analyzer,
        analysis,
        fallback_title: pickEventTitle(signals.map((s) => s.title)),
      })
    : null;

  await prisma.$transaction([
    prisma.newsEvent.update({
      where: { id: eventId },
      data: {
        heat_score,
        velocity_pct,
        status,
        signal_count: signals.length,
        source_count: new Set(signals.map((s) => s.source_name)).size,
        source_names: sourceNames,
        first_seen_at: firstSeenAt,
        last_activity_at: lastActivityAt,
        ...(content
          ? {
              title: content.title,
              summary: content.summary,
              analyzer: content.analyzer,
              analyzed_at: now,
            }
          : {}),
      },
    }),
    ...(analysis
      ? [
          prisma.eventTimelineEntry.deleteMany({ where: { event_id: eventId } }),
          prisma.eventTimelineEntry.createMany({
            data: analysis.timeline.map((entry) => ({
              tenant_id: event.tenant_id,
              event_id: eventId,
              occurred_at: entry.occurred_at,
              label_code: entry.label_code,
              label_text: entry.label_text,
              source_kind: entry.source_kind,
              source_name: entry.source_name,
              signal_id: entry.signal_id,
              url: entry.url,
            })),
          }),
        ]
      : []),
  ]);

  return true;
}

function toAnalyzerSignal(signal: {
  id: string;
  title: string;
  url: string;
  excerpt: string;
  source_name: string;
  source_kind: string;
  published_at: Date;
}): AnalyzerSignal {
  return {
    signal_id: signal.id,
    title: signal.title,
    url: signal.url,
    excerpt: signal.excerpt,
    source_name: signal.source_name,
    source_kind: signal.source_kind as EventSourceKind,
    published_at: signal.published_at,
  };
}

/**
 * 人工改过的标题/摘要必须保住。热度与时间线仍按信号重算，但文案以工作台为准。
 */
export function resolveRefreshedContent(params: {
  manual_content: boolean;
  existing_title: string;
  existing_summary: string;
  existing_analyzer: string;
  analysis: { title: string; summary: string; analyzer: string };
  fallback_title: string;
}): { title: string; summary: string; analyzer: string } {
  if (params.manual_content) {
    return {
      title: params.existing_title,
      summary: params.existing_summary,
      analyzer: params.existing_analyzer,
    };
  }
  return {
    title:
      params.analysis.title.trim().length > 0
        ? params.analysis.title
        : params.fallback_title,
    summary: params.analysis.summary,
    analyzer: params.analysis.analyzer,
  };
}

export function shouldReanalyze(
  analyzedAt: Date | null,
  now: Date,
  analyzerId: string,
): boolean {
  if (analyzedAt === null) {
    return true;
  }
  if (analyzerId !== "llm") {
    return true;
  }
  return now.getTime() - analyzedAt.getTime() >= LLM_REANALYZE_COOLDOWN_MS;
}
