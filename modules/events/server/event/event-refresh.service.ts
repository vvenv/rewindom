import {
  config,
  prisma,
  withTenantScope,
  type Prisma,
} from "@rewindom/module-sdk/server";

import {
  analyzeEvent,
  classifyEvent,
  heuristicAnalyzer,
  resolveEventAnalyzer,
} from "./analyzer/index.js";
import { extractEntities, isEntityKind } from "./entity-extractor.js";
import {
  ensurePublisherEntityLinks,
  syncEventEntities,
} from "./entity.service.js";
import {
  loadPublisherFeedIndex,
  resolvePublisherEntities,
  type PublisherFeedIndex,
} from "./publisher-entity.js";
import { diffEventRevisions } from "./event-revision.service.js";
import { computeHeat, resolveStatus, type HeatSignal } from "./heat.js";
import { pickEventTitle } from "./title-tokens.js";
import { classifyEventTopic } from "./topic-classifier.js";
import { getEnabledTopics } from "./topic-settings.service.js";
import { enabledTopicWhere, isEventKind } from "../../shared/index.js";
import { classifyEventKind, eventKindPrior } from "./kind-classifier.js";
import { extractEventFacts } from "./fact-extractor.js";
import {
  incidentDurationMinutes,
  incidentResolved,
  type IncidentUpdate,
} from "../ingest/incident-updates.js";

import type {
  AnalyzedEntity,
  AnalyzerSignal,
  AnalyzerUsage,
  EventAnalyzer,
  EventClassification,
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
  /**
   * 这一趟允不允许做窄分类调用。**默认不允许**——只有采集轮开。
   *
   * 三个调用方里只有采集轮该开：
   *
   * - **保留期清理**refresh 的是「信号刚被删掉」的事件，其中一批紧接着就会被
   *   连事件一起删。给一个马上要消失的事件付一次分类费是纯浪费。
   * - **工作台移除信号**跑在**请求路径上**。默认开的话，管理员点一下「移除」
   *   要同步等一次模型往返——一个本地写操作凭空多出几秒延迟，还是在
   *   供应商超时的时候变成十几秒。
   *
   * 失效方向也对：忘了开只是分类不跑（下一轮采集补上），忘了关是花钱 + 卡请求。
   */
  classify?: boolean;
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
 * 分类窗口的库内谓词。
 *
 * 两条：**没付过分类费**，且 **`source_kind` 先验答不上来**。
 *
 * 第二条是实测教训。先验压过模型（见 `eventKindPrior`），所以问一个先验
 * 已经能回答的事件是纯浪费——而窗口按 `last_activity_at` 降序，状态页恰恰是
 * 全语料里最活跃的一类，会把预算整轮吃光：第一版上线后捞回来的头 36 个
 * 全是状态页维护通告，模型答 maintenance、先验答 outage、最终落 outage，
 * 36 次调用一次都没改变结果。
 *
 * `source_kinds` 是 `eventKindPrior` 判据的**逐字库内镜像**——它只看
 * 「有没有 status / release 信号」，两处一起改。缺 kind 覆盖的从来不是这两格
 *（status 449/449、release 310/310 全满），是 news 2.3% / official 3.3% /
 * community 1.4% 那三格。
 *
 * 第三条是**马上要被清理掉的事件不花钱**。`last_activity_at` 是最新一条信号的
 * 发布时刻，它早于信号保留期截止 = 这个事件的信号**全部**已经过期，
 * 下一次保留期清理会把它们删光、事件跟着变成空壳被删。与「保留期清理那一趟
 * 不开 classify」是同一条理由，只是这里挡的是另一条路径。
 *
 * 实测代价：孤儿补跑把一批贴着 90 天线的信号聚成了事件，其中约 29 个刚分类完
 * 就被当轮清理删掉了（本地库 classified 从 74 掉回 45）——那几十次调用是白付的。
 *
 * 第四条是**关掉的主题不花钱**，与热度窗同一条理由（「排在后面的事件付了模型费
 * 也没人看」）。这批事件不是假想的：聚类按语料办事、不按显示口径办事，
 * 所以一个站点把主题关掉之后，库里既有的信号照样会聚成那个主题的事件——
 * 本地库 5967 个事件里有 671 个（11%）落在已关掉的四个主题上。
 * 它们该留着（主题重新打开时就在），但不该占分类预算。
 */
export function classifyWindowWhere(
  enabledTopics: readonly EventTopic[],
  signalCutoff: Date,
): Prisma.NewsEventWhereInput {
  return {
    classified_at: null,
    NOT: { source_kinds: { hasSome: ["status", "release"] } },
    last_activity_at: { gte: signalCutoff },
    ...enabledTopicWhere(enabledTopics),
  };
}

/** 信号保留期的截止时刻——比这更早发布的信号下一轮清理就没了。 */
function signalRetentionCutoff(now: Date): Date {
  return new Date(
    now.getTime() - config.events.signalRetentionDays * 24 * 60 * 60 * 1000,
  );
}

/**
 * 取本轮允许做窄分类的事件 id。
 *
 * 与 `loadHeatWindow` 同一个形状：每站点查一次，传给按事件的循环——
 * 放进循环里逐个查等于每轮多几百次往返，只为一份完全相同的表。
 *
 * 排序按 `last_activity_at` 降序：积压清完之前，先补最近还在动的事件。
 * 顺带让「一个总是调用失败的事件长期占着一个名额」这件事自愈——
 * 它会随着新事件进来而自然沉底。
 *
 * `limit <= 0` 返回空集合（**关掉**），不是 null。这与热度窗的 `null = 不限`
 * 刻意相反，见 `EVENTS_LLM_CLASSIFY_PER_ROUND` 的注释。
 */
async function loadClassifyWindow(
  tenantId: string,
  limit: number,
  now: Date,
): Promise<Set<string>> {
  return new Set(await listClassifyCandidates(tenantId, limit, now));
}

/**
 * 本轮该分类哪些事件——**给采集轮用，好把它们塞进刷新队列**。
 *
 * 分类挂在 `refreshEvent` 里，所以只有进了 `touched` 的事件才轮得到。
 * 而 `touched` 的三个来源（本轮聚类动过的、信号指标变过的、降温扫描捞的）
 * 都偏向**新事件与还在动的事件**——`cooling` / `resolved` 的老事件再也不会
 * 被刷新一次。实测：不把窗口并进 `touched` 时，一轮只classify 得到 4 个，
 * 六千个存量事件要排半个月。
 *
 * 多跑一次查询（`refreshEvents` 内部还会按站点再取一次做闸门）是刻意的：
 * 闸门那次才是权威。两次之间数据变了最多让某个事件这一轮白刷一次，
 * 不会重复付费——`classified_at` 是在库里记的。
 */
export async function listClassifyCandidates(
  tenantId: string,
  limit = config.events.llmClassifyPerRound,
  now = new Date(),
): Promise<string[]> {
  if (limit <= 0) {
    return [];
  }
  const rows = await prisma.newsEvent.findMany({
    where: withTenantScope(
      tenantId,
      classifyWindowWhere(
        await getEnabledTopics(tenantId),
        signalRetentionCutoff(now),
      ),
    ),
    select: { id: true },
    orderBy: { last_activity_at: "desc" },
    take: limit,
  });
  return rows.map((row) => row.id);
}

/**
 * 这个事件这一轮该不该做一次窄分类调用。
 *
 * 与 `planAnalysis` 刻意分开：那个函数问的是「这一轮内容要不要重算」，
 * 判据是信号集合变没变；分类问的是「这个事件付过分类费没有」，判据在库里
 * （`classified_at`），与信号变化无关。塞进同一个返回值会让那句
 * 「信号没变 → skip」的早退把整个存量语料挡在门外——而存量语料正是目标。
 */
export function shouldClassify(params: {
  analyzer_id: string;
  /** 库里这份内容是谁写的（`NewsEvent.analyzer`） */
  existing_analyzer: string;
  /** 本轮内容分析的结论（`planAnalysis`） */
  content_plan: AnalysisPlan;
  /** 本轮实时算出的 `source_kind` 先验有没有给出答案 */
  has_kind_prior: boolean;
  classified_at: Date | null;
  in_classify_window: boolean;
}): boolean {
  // 没有模型就没有这条路——规则实现的「分类」就是关键词表本身，已经在跑
  if (params.analyzer_id !== "llm") {
    return false;
  }
  // 终生一次
  if (params.classified_at !== null) {
    return false;
  }
  // 跑过完整分析的不必再补一次窄的：那一次已经顺带给了 kind 与 entities
  if (params.existing_analyzer === "llm") {
    return false;
  }
  /*
   * 本轮就要跑完整分析时也不补——那一次在**同一个调用**里给出 kind 与 entities。
   * 命中的是一个真实存在的组合：一个刚立的双信号热门事件，`analyzed_at` 为空
   * （→ plan = model）而 `analyzer` 还是默认的 heuristic（→ 上面那条拦不住），
   * 于是一轮里发两次模型调用，其中一次的产出会被另一次整个覆盖。
   */
  if (params.content_plan === "model") {
    return false;
  }
  /*
   * `source_kind` 先验能回答就不问模型——先验压过模型，问了也用不上。
   *
   * `classifyWindowWhere` 里有同一条判据，但那份读的是**库里存的**
   * `source_kinds`，而刚建的事件那一列还是空的（要等这一轮 refresh 才写进去）。
   * 于是补跑期间有 8 个状态页事件溜过了库侧过滤。**库内谓词只能当预筛，
   * 权威判断必须用本轮实时算出来的先验。**
   *
   * 漏进来的会白占一个窗口名额，但只占一轮：下一轮 `source_kinds` 已经落库，
   * 库侧那条就拦得住了，而 `classified_at` 仍是空——不会被误记成付过费。
   */
  if (params.has_kind_prior) {
    return false;
  }
  return params.in_classify_window;
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

  // 出版方标注同样是每站点一份，与榜单同一条口径（见 loadPublisherFeedIndex）
  const publisherFeeds = new Map<string, Promise<PublisherFeedIndex>>();
  const publisherFeedsFor = (tenantId: string): Promise<PublisherFeedIndex> => {
    let pending = publisherFeeds.get(tenantId);
    if (!pending) {
      pending = loadPublisherFeedIndex(tenantId);
      publisherFeeds.set(tenantId, pending);
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

  // 分类的按轮限额，同样每站点一份。没开这一趟就连查都不查。
  const classifyWindows = new Map<string, Promise<Set<string>>>();
  const classifyWindowFor = (tenantId: string): Promise<Set<string>> => {
    if (!options.classify) {
      return Promise.resolve(new Set());
    }
    let pending = classifyWindows.get(tenantId);
    if (!pending) {
      pending = loadClassifyWindow(
        tenantId,
        config.events.llmClassifyPerRound,
        now,
      );
      classifyWindows.set(tenantId, pending);
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
        classifyWindowFor,
        publisherFeedsFor,
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

/**
 * 一轮刷新里所有事件共享的东西：按站点解析一次的分析器、热度榜单与出版方标注。
 * 每一项都是「每站点一份」——放进按事件的循环等于把同一份数据读几百遍。
 */
interface RefreshContext {
  now: Date;
  options: RefreshEventsOptions;
  analyzerFor: (tenantId: string) => Promise<EventAnalyzer>;
  heatWindowFor: (tenantId: string) => Promise<Set<string> | null>;
  classifyWindowFor: (tenantId: string) => Promise<Set<string>>;
  publisherFeedsFor: (tenantId: string) => Promise<PublisherFeedIndex>;
}

async function refreshEvent(
  eventId: string,
  ctx: RefreshContext,
): Promise<boolean> {
  const { now, options, analyzerFor, heatWindowFor, classifyWindowFor } = ctx;
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
      model_kind: true,
      classified_at: true,
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
      // 出版方实体按 (connector, source_name) 解析回采集源
      connector: true,
      topic: true,
      score: true,
      comment_count: true,
      published_at: true,
      // 故障的时长与结局来自这条一手更新序列，不由文本推断
      incident_updates: true,
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
   * 事件类型与关键事实，每轮重算。
   *
   * 判定优先级：`source_kind` 先验 > LLM > 关键词。先验最硬——Statuspage 的
   * 一条 incident 就是一次故障，模型看着一段「已恢复」的正文很可能判成别的，
   * 所以 classifyEventKind 内部先看先验，模型的答案只在没有先验时才用得上。
   *
   * **不受 manual_content 冻结**：那把锁锁的是标题与摘要（人写的文案），
   * 而 kind 与 facts 是派生事实——人工改过摘要不该让故障时长停在旧值。
   *
   * 先验要在**分类调用之前**算出来：它是「这次问不问模型」的判据之一
   * （问了也用不上），而库里那份 `source_kinds` 对刚建的事件还是空的。
   */
  const classifiableSignals = signals.map((signal) => ({
    title: signal.title,
    excerpt: signal.excerpt,
    source_kind: signal.source_kind as EventSourceKind,
    // 状态页的阶段词决定这次是事故还是计划维护，先验要看得到它
    incident_updates: toIncidentUpdates(signal.incident_updates),
  }));
  const kindPrior = eventKindPrior(classifiableSignals);

  /*
   * 窄分类。绕开上面三道省钱闸门，另走一条按轮限额、终生一次的路——
   * 它服务的是被闸门拦下的那 98.4% 单信号事件，而分类恰恰是它们唯一
   * 能拿到的增量（跨源印证与时间线对单信号按定义不存在）。
   *
   * 已经跑过完整 LLM 分析的不走这条路（那一次顺带给过 kind 与 entities）。
   */
  const classification =
    analyzer.id === "llm" &&
    shouldClassify({
      analyzer_id: analyzer.id,
      existing_analyzer: event.analyzer,
      content_plan: plan,
      has_kind_prior: kindPrior !== null,
      classified_at: event.classified_at,
      in_classify_window: (await classifyWindowFor(event.tenant_id)).has(
        eventId,
      ),
    })
      ? await classifyEvent(
          {
            topic: event.topic as EventTopic,
            signals: signals.map(toAnalyzerSignal),
          },
          analyzer,
          (err) => options.onAnalyzerFallback?.(eventId, err),
        )
      : null;

  if (classification?.usage) {
    options.onAnalyzerUsage?.(eventId, classification.usage);
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
   * 判定链上多了一环 `event.model_kind`——**模型的答案要存得住**。
   *
   * 以前只有 `analysis?.kind`，而降温扫描下 analysis 恒为 null，于是上一轮
   * 模型判出的 acquisition 会被关键词的 null 覆盖掉。本地库 news 那一格
   * 1447 个事件只有 34 个有 kind，正好等于关键词命中率——模型的答案一轮
   * 都没活下来。先验仍然最硬（Statuspage 的一条 incident 就是一次故障），
   * 本轮模型次之，历史模型答案再次之，关键词兜底。
   */
  const modelKind = analysis?.kind ?? classification?.kind ?? null;
  const kind =
    kindPrior ??
    modelKind ??
    (isEventKind(event.model_kind) ? event.model_kind : null) ??
    classifyEventKind(classifiableSignals);

  const facts = extractEventFacts(kind, signals);
  if (kind === "outage" || kind === "maintenance") {
    /*
     * 时长只认一手更新序列。全事件取**最长**的那条 incident——
     * 一个事件可能聚了同一次故障在多个状态页上的记录，取最长的那份最接近
     * 「这次故障持续了多久」，而取首条只是取抓到顺序里的第一份。
     *
     * 维护走同一套算法、不同读法：那是维护窗口的长度与「做完了没有」
     * （文案分叉在 `describeEventFacts`，两种 kind 各一组 chip code）。
     */
    const sequences = signals
      .map((signal) => toIncidentUpdates(signal.incident_updates))
      .filter((updates) => updates.length > 0);
    for (const updates of sequences) {
      const minutes = incidentDurationMinutes(updates);
      if (minutes !== null && minutes > (facts.duration_minutes ?? -1)) {
        facts.duration_minutes = minutes;
      }
      const resolved = incidentResolved(updates);
      // 有一条还没收尾就算没收尾——宁可说「进行中」，不要过早宣布结束
      if (resolved !== null) {
        facts.resolved = (facts.resolved ?? true) && resolved;
      }
    }
  }

  /*
   * 实体：LLM 在同一次分析调用里给了就用它的（有类型、更准），
   * 否则走保守的规则抽取。
   *
   * **只在真的重算过分析时才动实体**（`analysis !== null`）。LLM 有 30 分钟冷却，
   * 冷却期内 `analysis` 是 null——此时若回落到规则抽取，实体类型会从 `company`
   * 掉回 `org`，而类型是身份键的一部分，于是每轮都新建一份重复实体、关联反复重连。
   * 与标题/摘要同理：没有重算就不覆盖。
   */
  const analyzedEntities = pickAnalyzedEntities(analysis, classification);
  const entities = !analyzedEntities
    ? null
    : analyzedEntities.model && analyzedEntities.model.length > 0
      ? analyzedEntities.model.flatMap((entity) =>
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
        kind,
        fact_version: facts.version,
        fact_amount_text: facts.amount_text,
        fact_amount_usd: facts.amount_usd,
        fact_duration_minutes: facts.duration_minutes,
        fact_resolved: facts.resolved,
        first_seen_at: firstSeenAt,
        last_activity_at: lastActivityAt,
        /*
         * **只有真的问过模型的那一轮才写 model_kind**。判据是「模型这条路跑通了」：
         * `analyzeEvent` 退回规则实现时会把 `analyzer` 标成 heuristic，
         * `classifyEvent` 失败时返回 null——两者都是可靠信号。
         *
         * 刻意**不看 `usage`**：那是供应商可选字段，有的供应商压根不报，
         * 而「没报用量」与「没问过模型」是两件完全不同的事。按 usage 判会让
         * 那些供应商上的模型答案继续存不住——正是这一列要修的那个 bug。
         *
         * 没问过就不写：否则降温扫描会拿 null 把上一次的答案抹掉，与
         * 「没有重算就不覆盖」（标题 / 摘要 / 实体那三条）是同一条原则。
         * 真的问过而模型说「不是任何一类」时**要写 null**——那是一个答案。
         */
        ...(analysis?.analyzer === "llm" || classification
          ? { model_kind: modelKind }
          : {}),
        /*
         * 分类**成功**才记时刻：一次供应商抖动不该让这个事件终生没有类型。
         * `classifyEvent` 失败返回 null，这一轮的名额浪费掉，下一轮重来。
         */
        ...(classification ? { classified_at: now } : {}),
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
  /*
   * 出版方实体（采集源标注的一手来源身份）与分析器**解耦**：
   * 它不是分析器产物，没有理由跟着 LLM 的冷却走。
   *
   * - 重跑过分析：并进 wanted 集合一起 sync（整体替换会把没并进去的删掉）
   * - 没重跑：走只增不删的那条，保证冷却期内关联仍在
   */
  const publishers = resolvePublisherEntities(
    await ctx.publisherFeedsFor(event.tenant_id),
    signals.map((signal) => ({
      connector: signal.connector,
      source_name: signal.source_name,
      source_kind: signal.source_kind as EventSourceKind,
    })),
  );

  if (entities) {
    await syncEventEntities({
      tenant_id: event.tenant_id,
      event_id: eventId,
      entities,
      publishers,
    });
  } else if (publishers.length > 0) {
    await ensurePublisherEntityLinks({
      tenant_id: event.tenant_id,
      event_id: eventId,
      publishers,
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

/**
 * Prisma 的 Json 列回来是 `unknown`——不能直接当成结构化数据用。
 *
 * 校验刻意浅：只认「数组 + 每项有 occurred_at / phase / text 三个字符串」。
 * 形状不对整条弃权，落回「没有更新序列」而不是抛错——一条脏数据不该让
 * 整轮刷新失败。
 */
function toIncidentUpdates(value: unknown): IncidentUpdate[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (item): item is IncidentUpdate =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as IncidentUpdate).occurred_at === "string" &&
      typeof (item as IncidentUpdate).phase === "string" &&
      typeof (item as IncidentUpdate).text === "string",
  );
}

/**
 * 这一轮的实体该听谁的。
 *
 * `null` = **这一轮谁都没重算过，不要动实体**。这条是既有约束：LLM 有 30 分钟
 * 冷却，冷却期内回落到规则抽取会让实体类型从 `company` 掉回 `org`，而类型是
 * 身份键的一部分，于是每轮新建一份重复实体、关联反复重连。
 *
 * **判据是「这份产出是不是模型给的」，不是「有没有跑过分析」。**
 * 差别在最常见的那条路上：一个新事件第一轮的 plan 是 `local`（规则实现），
 * 同一轮又恰好排进分类窗口——此时 `analysis` 非空但它是规则实现的产出，
 * 而规则实现**不产实体**（`entities` 恒为 undefined）。按「有分析就听分析的」
 * 写，分类刚问回来的实体会被整个丢掉，正好丢在最该用它的场景上。
 *
 * 排序：完整 LLM 分析 > 窄分类 > 规则抽取。前两者同时发生时听完整分析的，
 * 它读过全文与时间线，实体更有上下文。
 *
 * 回落到规则抽取**不会**降级已有实体：`shouldClassify` 排除了
 * `existing_analyzer === "llm"` 的事件，所以走到这条路上的事件，
 * 库里那份本来就是规则抽取的产物。
 *
 * `model` 为空数组时调用方回落到规则抽取——「模型跑过但一个实体都没给」
 * 与「没跑模型」是两件事，前者仍然该让规则实现兜一份。
 */
export function pickAnalyzedEntities(
  analysis: { analyzer: string; entities?: AnalyzedEntity[] } | null,
  classification: EventClassification | null,
): { model: AnalyzedEntity[] | undefined } | null {
  if (!analysis && !classification) {
    return null;
  }
  const fromFullAnalysis =
    analysis?.analyzer === "llm" ? analysis.entities : undefined;
  return { model: fromFullAnalysis ?? classification?.entities };
}
