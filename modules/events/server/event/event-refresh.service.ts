import { prisma } from "@rewindom/module-sdk/server";

import { analyzeEvent, resolveEventAnalyzer } from "./analyzer/index.js";
import { extractEntities, isEntityKind } from "./entity-extractor.js";
import { syncEventEntities } from "./entity.service.js";
import { diffEventRevisions } from "./event-revision.service.js";
import { computeHeat, resolveStatus, type HeatSignal } from "./heat.js";
import { pickEventTitle } from "./title-tokens.js";
import { classifyEventTopic } from "./topic-classifier.js";

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
      manual_topic: true,
      status: true,
      source_names: true,
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
      topic: true,
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
    source_name: signal.source_name,
  }));

  const heat = computeHeat(heatSignals, now);
  const { heat_score, velocity_pct } = heat;
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

  /*
   * 主题每轮重算。它以前是采集源的属性（HN=tech、OpenAI=ai），跟着第一条信号
   * 一路写死；现在由整簇信号的文本判定，LLM 读得懂内容时以它为准。
   * 工作台指定过的主题不覆盖——与 manual_content 对文案同理。
   */
  const topic = event.manual_topic
    ? (event.topic as EventTopic)
    : (analysis?.topic ??
      classifyEventTopic(
        signals.map((signal) => ({
          title: signal.title,
          excerpt: signal.excerpt,
          source_kind: signal.source_kind as EventSourceKind,
          topic_hint: signal.topic,
        })),
      ));

  /*
   * 实体：LLM 在同一次分析调用里给了就用它的（有类型、更准），
   * 否则走保守的规则抽取。
   *
   * **只在真的重算过分析时才动实体**（`analysis !== null`）。LLM 有 30 分钟冷却，
   * 冷却期内 `analysis` 是 null——此时若回落到规则抽取，实体类型会从 `company`
   * 掉回 `org`，而类型是身份键的一部分，于是每轮都新建一份重复实体、关联反复重连。
   * 与标题/摘要同理：没有重算就不覆盖。
   */
  const entities = !analysis
    ? null
    : analysis.entities && analysis.entities.length > 0
      ? analysis.entities.flatMap((entity) =>
          isEntityKind(entity.kind)
            ? [
                {
                  name: entity.name,
                  kind: entity.kind,
                  mention_count: entity.mention_count ?? 1,
                },
              ]
            : [],
        )
      : extractEntities(
          signals.map((signal) => ({
            title: signal.title,
            excerpt: signal.excerpt,
            source_kind: signal.source_kind as EventSourceKind,
          })),
        );

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

  const nextTitle = content?.title ?? event.title;
  const nextSummary = content?.summary ?? event.summary;
  const revisions = diffEventRevisions({
    before: {
      title: event.title,
      summary: event.summary,
      status: event.status,
      source_names: event.source_names,
    },
    after: {
      title: nextTitle,
      summary: nextSummary,
      status,
      source_names: sourceNames,
    },
    signals: signals.map((signal) => ({
      source_name: signal.source_name,
      source_kind: signal.source_kind as EventSourceKind,
      published_at: signal.published_at,
    })),
    now,
  });

  await prisma.$transaction([
    prisma.newsEvent.update({
      where: { id: eventId },
      data: {
        heat_score,
        velocity_pct,
        has_velocity_baseline: heat.has_velocity_baseline,
        recent_signal_count: heat.recent_signal_count,
        recent_source_count: heat.recent_source_count,
        status,
        signal_count: signals.length,
        source_count: new Set(signals.map((s) => s.source_name)).size,
        source_names: sourceNames,
        topic,
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
    /*
     * 时间线按 (event_id, signal_id) 增量 upsert，不再整条删了重插。
     *
     * 以前每轮都 deleteMany + createMany：heuristic 下 shouldReanalyze 恒为 true，
     * 叠加最多 200 条降温扫描 = 每 15 分钟每租户约 400 删 + 400 插，内容还一模一样。
     * 更要命的是 id 每轮都变，格子无法锚定、无法引用，也就无法回答「这一格是新出现的吗」。
     */
    ...(analysis
      ? analysis.timeline.map((entry) => {
          const data = {
            occurred_at: entry.occurred_at,
            label_code: entry.label_code,
            label_text: entry.label_text,
            source_kind: entry.source_kind,
            source_name: entry.source_name,
            url: entry.url,
          };
          return prisma.eventTimelineEntry.upsert({
            where: {
              event_id_signal_id: {
                event_id: eventId,
                signal_id: entry.signal_id,
              },
            },
            create: {
              tenant_id: event.tenant_id,
              event_id: eventId,
              signal_id: entry.signal_id,
              ...data,
            },
            update: data,
          });
        })
      : []),
    // 信号消失（保留期清理、重新聚类）后留下的格子要清掉——
    // 这是「删除不再存在的」，不是「先清空再重建」
    ...(analysis
      ? [
          prisma.eventTimelineEntry.deleteMany({
            where: {
              event_id: eventId,
              signal_id: {
                notIn: analysis.timeline.map((entry) => entry.signal_id),
              },
            },
          }),
        ]
      : []),
    ...(revisions.length > 0
      ? [
          prisma.eventRevision.createMany({
            data: revisions.map((revision) => ({
              tenant_id: event.tenant_id,
              event_id: eventId,
              kind: revision.kind,
              before: revision.before ?? undefined,
              after: revision.after,
              occurred_at: revision.occurred_at,
            })),
            // 唯一键 (event_id, kind, occurred_at) 挡住重跑产生的重复：
            // refreshEvents 幂等，修订写入也必须幂等
            skipDuplicates: true,
          }),
        ]
      : []),
  ]);

  /*
   * 实体在事务外同步：它要先 upsert 实体行再建关联，写法上是「读-写-读」，
   * 塞进上面那个批量事务只会拉长持锁时间，而实体关联晚一拍不影响任何读路径。
   */
  if (entities) {
    await syncEventEntities({
      tenant_id: event.tenant_id,
      event_id: eventId,
      entities,
    });
  }

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
