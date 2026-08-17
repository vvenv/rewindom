import { prisma } from "@rewindom/module-sdk/server";

import { analyzeEvent, resolveEventAnalyzer } from "./analyzer/index.js";
import { computeHeat, resolveStatus, type HeatSignal } from "./heat.js";
import { pickEventTitle } from "./title-tokens.js";

import {
  detectOriginLocale,
  isEventLocalizedMap,
  mergeLocalizedMaps,
} from "../../shared/index.js";

import type { AnalyzerSignal } from "./analyzer/index.js";
import type {
  EventLocalizedMap,
  EventSourceKind,
  EventTopic,
} from "../../shared/index.js";
import type { AppLocale } from "@rewindom/module-sdk";

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

  for (const eventId of new Set(eventIds)) {
    const changed = await refreshEvent(eventId, now, options);
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
): Promise<boolean> {
  const event = await prisma.newsEvent.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      topic: true,
      analyzed_at: true,
      analyzer: true,
      title: true,
      summary: true,
      title_i18n: true,
      summary_i18n: true,
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

  // 原文语种按信号标题判定，而不是按事件已有标题——已有标题可能来自上一轮的另一批信号
  const originLocale = detectOriginLocale(
    signals.map((signal) => signal.title).join(" "),
  );

  const analysis = shouldReanalyze(event.analyzed_at, now)
    ? await analyzeEvent(
        {
          topic: event.topic as EventTopic,
          origin_locale: originLocale,
          signals: signals.map(toAnalyzerSignal),
        },
        (err) => options.onAnalyzerFallback?.(eventId, err),
      )
    : null;

  const localized = analysis
    ? {
        title_i18n: carryOverTranslations(
          event.title_i18n,
          event.title,
          analysis.title,
          originLocale,
          analysis.title_i18n,
        ),
        summary_i18n: carryOverTranslations(
          event.summary_i18n,
          event.summary,
          analysis.summary,
          originLocale,
          analysis.summary_i18n,
        ),
      }
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
        origin_locale: originLocale,
        ...(analysis && localized
          ? {
              // 分析器给不出标题时不要把已有标题覆盖成空串
              title:
                analysis.title.trim().length > 0
                  ? analysis.title
                  : pickEventTitle(signals.map((s) => s.title)),
              summary: analysis.summary,
              title_i18n: localized.title_i18n,
              summary_i18n: localized.summary_i18n,
              analyzer: analysis.analyzer,
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
              event_id: eventId,
              occurred_at: entry.occurred_at,
              label_code: entry.label_code,
              label_text: entry.label_text,
              label_text_i18n: entry.label_text_i18n ?? undefined,
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
 * 决定已有译文还能不能继续用。
 *
 * 翻译（无论来自 LLM 还是 MyMemory）都是有成本的，而 `refreshEvents` 每轮都会跑。
 * 判据是**原文有没有变**：语言表里恒含原文那一条，拿它和本轮的原文一比就知道
 * 旧译文是不是还对得上。对得上就整表留着，一个字符都不用重翻；
 * 变了就整表作废——留着旧译文比没有译文更糟，那是在用旧标题冒充新事件。
 */
export function carryOverTranslations(
  storedMap: unknown,
  storedOrigin: string,
  nextOrigin: string,
  originLocale: AppLocale,
  freshMap: EventLocalizedMap,
): EventLocalizedMap {
  const stored = isEventLocalizedMap(storedMap) ? storedMap : {};
  // 语言表里的原文那条最权威；老数据没有表时退回 NewsEvent.title / summary 列
  const previousOrigin = stored[originLocale] ?? storedOrigin;
  const reusable =
    previousOrigin.trim().length > 0 &&
    previousOrigin.trim() === nextOrigin.trim();

  return mergeLocalizedMaps(reusable ? stored : {}, freshMap);
}

export function shouldReanalyze(
  analyzedAt: Date | null,
  now: Date,
  analyzerId: string = resolveEventAnalyzer().id,
): boolean {
  if (analyzedAt === null) {
    return true;
  }
  if (analyzerId !== "llm") {
    return true;
  }
  return now.getTime() - analyzedAt.getTime() >= LLM_REANALYZE_COOLDOWN_MS;
}
