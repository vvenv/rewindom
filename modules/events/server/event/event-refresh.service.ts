import { config, prisma, withTenantScope } from "@rewindom/module-sdk/server";

import {
  analyzeEvent,
  heuristicAnalyzer,
  resolveEventAnalyzer,
} from "./analyzer/index.js";
import { extractEntities, isEntityKind } from "./entity-extractor.js";
import { syncEventEntities } from "./entity.service.js";
import { diffEventRevisions } from "./event-revision.service.js";
import { computeHeat, resolveStatus, type HeatSignal } from "./heat.js";
import { pickEventTitle } from "./title-tokens.js";
import { classifyEventTopic } from "./topic-classifier.js";

import type {
  AnalyzerSignal,
  AnalyzerUsage,
  EventAnalyzer,
} from "./analyzer/index.js";
import type { EventSourceKind, EventTopic } from "../../shared/index.js";

/**
 * 事件年龄 → 冷却倍数（**从大到小排，取第一条命中**）。
 *
 * 冷却期本身解决的是「热门事件几分钟来十几条信号，不加冷却等于按信号数计费」；
 * 倍数解决的是另一半：一个跑了两天、已有六条信号的事件，第七条信号带来的
 * 摘要变化基本为零，却和第二条信号收一样的钱。
 *
 * 年龄按**最早一条信号的发布时间**算。补抓到的旧文章因此一进来就落在最长档——
 * 这是想要的：一篇 2023 年的文章重新冒头，不是一件正在快速演进的事。
 */
const COOLDOWN_STEPS: readonly { after_hours: number; multiplier: number }[] = [
  { after_hours: 24, multiplier: 12 },
  { after_hours: 6, multiplier: 4 },
];

/** 卡片上最多展示几个来源名。 */
const SOURCE_NAME_LIMIT = 8;

/**
 * 同时刷新几个事件。
 *
 * 每个事件的读写互不相干，幂等性不受影响。不设更高是因为并发的瓶颈在模型侧：
 * 撞上限流会退回规则实现，**而那是静默降级**——事件页不会开天窗，但摘要质量会悄悄变差。
 * 宁可慢一点，也不要用一堆退化的摘要把周期填满。
 */
const REFRESH_CONCURRENCY = 4;

export interface RefreshEventsOptions {
  now?: Date;
  onAnalyzerFallback?: (eventId: string, err: unknown) => void;
  /** 模型用量回调：调用方（采集任务）负责打日志，本模块不假设日志实现。 */
  onAnalyzerUsage?: (eventId: string, usage: AnalyzerUsage) => void;
}

/**
 * 取热度前 N 名的事件 id。
 *
 * 排序键与公开面 Now 段（`event.service.ts`）刻意一致：花钱分析的就是访客
 * 看得到的那一批。读的是**上一轮落库的** heat_score，比本轮实时热度晚一拍——
 * 可以接受，新事件走的是「从没分析过」那条路，不受这道闸门约束。
 */
async function loadHeatWindow(
  tenantId: string,
  limit: number,
): Promise<Set<string> | null> {
  if (limit <= 0) {
    return null;
  }
  const rows = await prisma.newsEvent.findMany({
    where: withTenantScope(tenantId, {}),
    select: { id: true },
    orderBy: [{ heat_score: "desc" }, { last_activity_at: "desc" }],
    take: limit,
  });
  return new Set(rows.map((row) => row.id));
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

  // 每个站点一次，不是每个事件一次——一轮刷新几百个事件共用同一份榜单
  const heatWindows = new Map<string, Promise<Set<string> | null>>();
  const heatWindowFor = (tenantId: string): Promise<Set<string> | null> => {
    let pending = heatWindows.get(tenantId);
    if (!pending) {
      pending = loadHeatWindow(tenantId, config.events.llmTopEvents);
      heatWindows.set(tenantId, pending);
    }
    return pending;
  };

  const queue = [...new Set(eventIds)];
  let cursor = 0;

  const worker = async (): Promise<void> => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= queue.length) {
        return;
      }
      const changed = await refreshEvent(queue[index], {
        now,
        options,
        analyzerFor,
        heatWindowFor,
      });
      if (changed) {
        refreshed += 1;
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(REFRESH_CONCURRENCY, queue.length) }, worker),
  );

  return refreshed;
}

/** 一轮刷新里所有事件共享的东西：按站点解析一次的分析器与热度榜单。 */
interface RefreshContext {
  now: Date;
  options: RefreshEventsOptions;
  analyzerFor: (tenantId: string) => Promise<EventAnalyzer>;
  heatWindowFor: (tenantId: string) => Promise<Set<string> | null>;
}

async function refreshEvent(
  eventId: string,
  ctx: RefreshContext,
): Promise<boolean> {
  const { now, options, analyzerFor, heatWindowFor } = ctx;
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
      // 变化检测：与本轮载入的条数比对，不等就说明信号集合变过
      signal_count: true,
    },
  });
  if (!event) {
    return false;
  }

  const signals = await prisma.eventSignal.findMany({
    // 手动移除过的不参与任何聚合——热度、阶段、时间线、摘要都当它不存在
    where: { event_id: eventId, removed_at: null },
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
  /*
   * 类型集合不设上限：它的基数就是 EVENT_SOURCE_KINDS 的长度（六），
   * 而 Rising 的过滤与公开面的类型筛都要求它是**完整**的——
   * 截断会让一个既有新闻报道又有发版公告的事件随机掉出 Rising。
   */
  const sourceKinds = [...new Set(signals.map((signal) => signal.source_kind))];

  const analyzer = await analyzerFor(event.tenant_id);
  // 规则实现不受闸门约束，榜单也就不用查——本地开发与 CI 走的正是这条路
  const heatWindow =
    analyzer.id === "llm" ? await heatWindowFor(event.tenant_id) : null;
  const plan = planAnalysis({
    analyzed_at: event.analyzed_at,
    existing_analyzer: event.analyzer,
    previous_signal_count: event.signal_count,
    signal_count: signals.length,
    first_seen_at: firstSeenAt,
    now,
    analyzer_id: analyzer.id,
    in_heat_window: heatWindow === null || heatWindow.has(eventId),
  });

  const analysis =
    plan === "skip"
      ? null
      : await analyzeEvent(
          {
            topic: event.topic as EventTopic,
            signals: signals.map(toAnalyzerSignal),
          },
          plan === "local" ? heuristicAnalyzer : analyzer,
          (err) => options.onAnalyzerFallback?.(eventId, err),
        );

  if (analysis?.usage) {
    options.onAnalyzerUsage?.(eventId, analysis.usage);
  }

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
        source_kinds: sourceKinds,
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

/**
 * 本轮拿这个事件怎么办。
 *
 * - `skip`：不跑分析器，库里的标题 / 摘要 / 时间线 / 实体原样留着
 * - `local`：跑规则分析器（零成本，不联网）
 * - `model`：跑本站解析出的分析器（有 key 时就是 LLM，要花钱）
 */
export type AnalysisPlan = "skip" | "local" | "model";

/**
 * 该不该重跑分析器、用哪个跑。
 *
 * **先看信号集合变没变，再看值不值得花钱，最后才看冷却。**
 *
 * 第一层（信号变没变）解决的是吞吐：曾经只按时间判，heuristic 恒为 true、
 * llm 只看 30 分钟冷却——而降温扫描捞的事件**按定义空闲 ≥6h**，于是每轮最多
 * 200 个事件、每个一次模型调用，全都是没有新信号的事件。分析器是信号集合的
 * 纯函数，信号没变时输出必然与上次相同，跳过不损失任何东西。
 *
 * 后面几层解决的是账单，对应 `config.events.llm*` 三个键：
 *
 * 1. **信号数不够**（`llmMinSignals`）：只有一条信号时 LLM 干的活退化成
 *    「给一篇文章换个说法」，而规则实现本来就把原标题与原摘录端上来了。
 *    实测语料里 98% 的事件终生只有一条信号——这道闸门是省钱的大头。
 * 2. **不在热度窗内**（`llmTopEvents`）：公开面只摆 Rising 5 + Now 10，
 *    排在后面的事件付了模型费也没人看。
 * 3. **还在冷却里**（`llmCooldownMinutes` × 年龄倍数）：老事件多来一条信号，
 *    摘要变化基本为零，却和第二条信号收一样的钱。
 *
 * 前两道闸门拦下的事件走 `local` 还是 `skip`，取决于它**有没有内容**：
 * 从没分析过的得先有一份，否则详情页开天窗；已经有 LLM 产出的一律 `skip`——
 * 拿规则产出覆盖一份已经付过钱的 LLM 产出是纯粹的降级，比不更新更糟。
 */
export function planAnalysis(params: {
  analyzed_at: Date | null;
  /** 库里这份内容是谁写的（`NewsEvent.analyzer`） */
  existing_analyzer: string;
  /** 上一次刷新时记录的信号数（`NewsEvent.signal_count`） */
  previous_signal_count: number;
  /** 本轮实际载入的信号数 */
  signal_count: number;
  /** 最早一条信号的发布时间，用来算冷却倍数 */
  first_seen_at: Date;
  now: Date;
  analyzer_id: string;
  /** 是否落在本站热度前 `llmTopEvents` 名内（该键为 0 时恒 true） */
  in_heat_window: boolean;
}): AnalysisPlan {
  // 从未分析过，或被显式要求重来（摘录补齐那条路径会把 analyzed_at 置空）
  const analyzedAt = params.analyzed_at;
  // 信号集合没变（没有新增，也没被保留期清掉）→ 内容不会变
  const changed = params.signal_count !== params.previous_signal_count;
  if (analyzedAt !== null && !changed) {
    return "skip";
  }

  // 规则实现零成本，下面三道闸门都不适用
  if (params.analyzer_id !== "llm") {
    return "model";
  }

  const { llmMinSignals, llmCooldownMinutes } = config.events;
  if (params.signal_count < llmMinSignals || !params.in_heat_window) {
    return analyzedAt === null && params.existing_analyzer !== "llm"
      ? "local"
      : "skip";
  }

  if (analyzedAt === null) {
    return "model";
  }

  const cooldownMs =
    llmCooldownMinutes *
    60 *
    1000 *
    resolveCooldownMultiplier(params.first_seen_at, params.now);
  return params.now.getTime() - analyzedAt.getTime() >= cooldownMs
    ? "model"
    : "skip";
}

/** 事件年龄命中的第一档倍数；都没命中就是 1（新事件按基础冷却）。 */
export function resolveCooldownMultiplier(
  firstSeenAt: Date,
  now: Date,
): number {
  const ageHours = (now.getTime() - firstSeenAt.getTime()) / (60 * 60 * 1000);
  return (
    COOLDOWN_STEPS.find((step) => ageHours >= step.after_hours)?.multiplier ?? 1
  );
}
