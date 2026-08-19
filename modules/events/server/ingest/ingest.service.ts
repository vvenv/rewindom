import {
  config,
  prisma,
  withTenantScope,
  type Prisma,
} from "@rewindom/module-sdk/server";

import { TENANT_MODULES_STORAGE_KEY } from "@rewindom/builtin/platform/shared/tenant-modules.js";

import { canonicalizeUrl } from "../event/canonical-url.js";
import { isEventsModuleEnabled } from "../lib/entitlement.js";
import { clusterSignals } from "../event/cluster.service.js";
import { buildFingerprint, tokenizeTitle } from "../event/title-tokens.js";
import { refreshEvents } from "../event/event-refresh.service.js";
import { syncRelatedEvents } from "../event/related.service.js";
import { getEnabledTopics } from "../event/topic-settings.service.js";

import {
  clearAnalysisForExcerptUpgrade,
  enrichStoredEmptyExcerpts,
} from "./excerpt-enrichment.js";
import { ensureDefaultFeeds } from "./feed-seed.js";
import { hackerNewsConnector } from "./hacker-news.connector.js";
import { fillEmptyExcerpts, isUsableExcerpt } from "./page-excerpt.js";
import { rssConnector } from "./rss.connector.js";

import { enabledTopicWhere } from "../../shared/index.js";

import type { ConnectorFeed, EventConnector, RawSignal } from "./connector.js";
import type { EventSourceKind, EventTopic } from "../../shared/index.js";
import type { FastifyBaseLogger } from "fastify";

const CONNECTORS: Record<string, EventConnector> = {
  [hackerNewsConnector.id]: hackerNewsConnector,
  [rssConnector.id]: rssConnector,
};

/**
 * 降温扫描：每轮顺带重算一批「上次还标着 developing/active、但已经很久没动静」的事件。
 * 没有它，一个事件只会在有新信号时被更新，热度就永远停在最后一次爆发的读数上。
 */
const DECAY_SWEEP_LIMIT = 200;
const DECAY_SWEEP_IDLE_HOURS = 6;

/**
 * 定时器允许早到多少：进程里的 setInterval 与库里的 `last_fetched_at` 之间总有
 * 毫秒级到秒级的漂移，卡死「必须满一个周期」会把每一轮都推迟到下一次心跳，
 * 15 分钟的周期实际跑成 30 分钟。
 */
const DUE_SKEW_MS = 60_000;

/**
 * 这个源这一轮该不该抓。
 *
 * **判据落在库里（`EventFeed.last_fetched_at`），不在进程里。**
 * 调度器的定时器是进程状态：每次 `pnpm release` 重启，boot 后 20s 就无条件跑一整轮，
 * 一天发六次版就凭空多出六轮完整采集——几百次目标页抓取、以及被摘录补齐
 * （`analyzed_at` 清零）牵连出的模型调用，全都是重复付费。`last_fetched_at`
 * 重启不会忘，没到周期的源这一轮直接不抓。
 *
 * 从没抓过的源（刚在工作台加上）恒为 true：新加的源不必等下一个周期。
 */
export function isFeedDue(
  lastFetchedAt: Date | null,
  now: Date,
  intervalMs: number,
): boolean {
  if (!lastFetchedAt) {
    return true;
  }
  return now.getTime() - lastFetchedAt.getTime() >= intervalMs - DUE_SKEW_MS;
}

export interface IngestFailure {
  feed: string;
  error: string;
}

export interface IngestSummary {
  feeds: number;
  /** 各 connector 返回的原始条目总数 */
  fetched: number;
  /** 其中此前没见过、真正入库的 */
  created: number;
  events_touched: number;
  failures: IngestFailure[];
  tenants: number;
  /** 本轮整站跳过的站点数：源都还没到周期（多见于发布重启后的第一轮） */
  tenants_skipped: number;
}

/**
 * 跑一轮采集：对每个开通了事件雷达的站点，抓取 → 落信号 → 聚类 → 重算事件。
 *
 * 单个源失败不影响其它源：错误记进 EventFeed.last_error 并计入 summary，
 * 一个挂掉的 RSS 不该让整轮采集归零。
 */
export async function runIngest(options?: {
  now?: Date;
  log?: FastifyBaseLogger;
}): Promise<IngestSummary> {
  const now = options?.now ?? new Date();
  const tenantIds = await listEventIngestTenantIds();

  const summary: IngestSummary = {
    feeds: 0,
    fetched: 0,
    created: 0,
    events_touched: 0,
    failures: [],
    tenants: tenantIds.length,
    tenants_skipped: 0,
  };

  for (const tenantId of tenantIds) {
    const part = await runIngestForTenant(tenantId, now, options?.log);
    if (!part) {
      summary.tenants_skipped += 1;
      continue;
    }
    summary.feeds += part.feeds;
    summary.fetched += part.fetched;
    summary.created += part.created;
    summary.events_touched += part.events_touched;
    summary.failures.push(...part.failures);
  }

  return summary;
}

/**
 * 跑一个站点的一轮。**返回 null = 整站跳过**（源都还没到周期）。
 *
 * 跳过的判据是「一个源都没到点」，不是「某个源没到点」：同一站点的源共用一个
 * 周期，实际表现就是全到或全不到。留出「有源到点就整轮照跑」这条路，是为了
 * 新加的源能立刻收进来，也让降温扫描跟着正常轮次走。
 *
 * 一个源都没有的站点（把主题全关了）不算跳过——它没有源可判，但已有语料的
 * 降温扫描还得继续跑，否则公开面会永远停在最后一次爆发的读数上。
 */
async function runIngestForTenant(
  tenantId: string,
  now: Date,
  log?: FastifyBaseLogger,
): Promise<Omit<IngestSummary, "tenants" | "tenants_skipped"> | null> {
  await ensureDefaultFeeds(tenantId);

  const enabledTopics = await getEnabledTopics(tenantId);
  // 关掉的主题：源自己的 enabled 不动，这一轮就是不抓。
  const allFeeds = await prisma.eventFeed.findMany({
    where: withTenantScope(tenantId, {
      enabled: true,
      ...enabledTopicWhere(enabledTopics),
    }),
    orderBy: { created_at: "asc" },
  });

  const intervalMs = config.events.ingestIntervalMinutes * 60 * 1000;
  const feeds = allFeeds.filter((feed) =>
    isFeedDue(feed.last_fetched_at, now, intervalMs),
  );
  if (allFeeds.length > 0 && feeds.length === 0) {
    log?.debug({ tenantId }, "[events] 源都未到采集周期，本轮跳过");
    return null;
  }

  const failures: IngestFailure[] = [];
  const newSignalIds: string[] = [];
  const changedSignalEventIds = new Set<string>();
  let fetched = 0;

  for (const feed of feeds) {
    const connector = CONNECTORS[feed.connector];
    if (!connector) {
      failures.push({
        feed: feed.name,
        error: `未知 connector：${feed.connector}`,
      });
      continue;
    }

    try {
      const raw = await connector.fetch(toConnectorFeed(feed));
      fetched += raw.length;

      const result = await persistSignals(tenantId, feed.connector, raw);
      newSignalIds.push(...result.created_ids);
      for (const eventId of result.touched_event_ids) {
        changedSignalEventIds.add(eventId);
      }

      await prisma.eventFeed.update({
        where: { id: feed.id },
        data: { last_fetched_at: now, last_error: null },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failures.push({ feed: feed.name, error: message });
      log?.warn({ err, feed: feed.name, tenantId }, "[events] 采集源抓取失败");
      await prisma.eventFeed.update({
        where: { id: feed.id },
        data: { last_fetched_at: now, last_error: message.slice(0, 500) },
      });
    }
  }

  for (const eventId of await enrichStoredEmptyExcerpts(tenantId, now)) {
    changedSignalEventIds.add(eventId);
  }

  const created = await prisma.eventSignal.findMany({
    where: withTenantScope(tenantId, { id: { in: newSignalIds } }),
    select: {
      id: true,
      tenant_id: true,
      title: true,
      // 摘录参与 embedding：标题措辞相近但说的是两件事时，它是主要消歧线索
      excerpt: true,
      topic: true,
      // 决定这条信号走不走文本聚类（非新闻源只按 canonical_url 归属）
      source_kind: true,
      canonical_url: true,
      published_at: true,
    },
  });

  const touched = await clusterSignals(created);
  for (const eventId of changedSignalEventIds) {
    touched.add(eventId);
  }
  for (const eventId of await findStaleEventIds(tenantId, now)) {
    touched.add(eventId);
  }

  /*
   * 模型用量按轮汇总打一条，不是每次调用打一条：一轮几十次调用逐条打日志
   * 只会把日志刷爆，而要回答的问题（这一轮花了多少、前缀缓存命中没有）
   * 恰恰是聚合量。`calls` 与 `events_touched` 的比值就是省钱闸门的实际效果。
   */
  const usage = { calls: 0, prompt: 0, completion: 0, cached: 0 };

  await refreshEvents(touched, {
    now,
    onAnalyzerFallback: (eventId, err) => {
      log?.warn(
        { err, eventId, tenantId },
        "[events] LLM 分析失败，已退回规则分析器",
      );
    },
    onAnalyzerUsage: (_eventId, row) => {
      usage.calls += 1;
      usage.prompt += row.prompt_tokens;
      usage.completion += row.completion_tokens;
      usage.cached += row.cached_prompt_tokens ?? 0;
    },
  });

  if (usage.calls > 0) {
    log?.info(
      {
        tenantId,
        llm_calls: usage.calls,
        events_touched: touched.size,
        prompt_tokens: usage.prompt,
        completion_tokens: usage.completion,
        cached_prompt_tokens: usage.cached,
      },
      "[events] 本轮模型用量",
    );
  }

  /*
   * 相关事件单独一趟，不并进 refreshEvents：候选向量要整批载入一次，
   * 塞进按事件的循环会把同一份几 MB 的数据重复读几十遍。
   */
  await syncRelatedEvents({ tenant_id: tenantId, event_ids: [...touched] });

  return {
    feeds: feeds.length,
    fetched,
    created: newSignalIds.length,
    events_touched: touched.size,
    failures,
  };
}

export async function listEventIngestTenantIds(): Promise<string[]> {
  const tenants = await prisma.tenant.findMany({
    where: { status: "active" },
    select: { id: true },
    orderBy: { created_at: "asc" },
  });
  if (tenants.length === 0) {
    return [];
  }

  const settings = await prisma.tenantSetting.findMany({
    where: {
      key: TENANT_MODULES_STORAGE_KEY,
      tenant_id: { in: tenants.map((row) => row.id) },
    },
    select: { tenant_id: true, value: true },
  });
  const byTenant = new Map(settings.map((row) => [row.tenant_id, row.value]));

  return tenants
    .filter((row) => isEventsModuleEnabled(byTenant.get(row.id)))
    .map((row) => row.id);
}

interface PersistResult {
  created_ids: string[];
  /** 已有信号的指标发生变化（HN 涨分）时，其所属事件也要重算热度 */
  touched_event_ids: string[];
}

/** 一条信号带上它的规范化 URL——身份判定与落库都要用，只算一次。 */
interface PreparedSignal {
  signal: RawSignal;
  canonical_url: string;
}

/**
 * 信号身份：**同一来源的同一篇原文**。
 *
 * 不能用源给的 `external_id`：BBC 的 RSS guid 是
 * `https://…/c77ggpgrp2do#0`，文章更新后同一篇会以 `#1` 再来一次，
 * 于是同一篇报道在事件时间线上占了两格、字字相同。
 *
 * 带上 `source_name` 是刻意的：不同来源指向同一篇原文**要保留两条**——
 * 那正是跨源印证的证据，事件聚类也靠 canonical_url 相等来合并。
 */
function identityKey(sourceName: string, canonicalUrl: string): string {
  return `${sourceName}\0${canonicalUrl}`;
}

/**
 * 重发键：**同一来源、同一分钟、同一篇报道**——URL 换了也算同一条。
 *
 * 线上真实漏合并：OpenAI 的 RSS 把同一篇公告用两个 slug 各发了一次
 *（`/index/chatgpt-for-teens` 与 `/index/introducing-chatgpt-for-teens`），
 * 两条的 canonical_url 与 external_id 都不相等，身份键与兜底键**同时失效**，
 * 于是事件时间线上出现两格字字相同的「OpenAI announced ChatGPT for Teens」，
 * 来源列表里也并排躺着两条同名链接。
 *
 * 判据用聚类那套标题指纹，而不是标题原文相等：换 slug 那一下常连带着改大小写、
 * 改标点、或加减 `Introducing` 这类停用词——`introducing-chatgpt-for-teens` 与
 * `chatgpt-for-teens` 之间差的正是这个。指纹是**词集合相等**，不是相似度：
 * 真改了实词（多一句「now rolling out」）就分成两条，这一层不试图去猜。
 * 三重收紧让误合并的代价降到可接受：
 *   - 同一来源（跨源指向同一篇要保留两条，见 `identityKey`）；
 *   - published_at 落在同一分钟（同一来源过几天再报一次是**真的新进展**，该占一格）；
 *   - 标题得有足够的实词，短标题与空标题不参与（`REPUBLISH_MIN_TOKENS`）。
 *
 * 已知边界：源给重发条目换了新的 published_at 时这一层拦不住。真发生了再收，
 * 别提前把窗口放宽到「同一天」——那会把连续跟进的报道错误折叠掉。
 */
const REPUBLISH_MIN_TOKENS = 4;

function republishKey(signal: {
  source_name: string;
  title: string;
  published_at: Date;
}): string | null {
  const tokens = tokenizeTitle(signal.title);
  if (tokens.length < REPUBLISH_MIN_TOKENS) {
    return null;
  }
  const minute = signal.published_at.toISOString().slice(0, 16);
  return `${signal.source_name}\0${minute}\0${buildFingerprint(tokens)}`;
}

/** 同一轮抓取内部去重（源分页重叠、同一篇给了两个 guid、或换 slug 重发）。 */
export function dedupeSignalsByIdentity(
  raw: readonly RawSignal[],
): PreparedSignal[] {
  const seenIdentity = new Set<string>();
  const seenRepublish = new Set<string>();
  const kept: PreparedSignal[] = [];

  for (const signal of raw) {
    const canonical_url = canonicalizeUrl(signal.url);
    const identity = identityKey(signal.source_name, canonical_url);
    const republish = republishKey(signal);
    if (
      seenIdentity.has(identity) ||
      (republish && seenRepublish.has(republish))
    ) {
      continue;
    }
    // 保留先出现的那条：源的排序通常把原始条目放在修订条目之前
    seenIdentity.add(identity);
    if (republish) {
      seenRepublish.add(republish);
    }
    kept.push({ signal, canonical_url });
  }

  return kept;
}

async function persistSignals(
  tenantId: string,
  connector: string,
  raw: readonly RawSignal[],
): Promise<PersistResult> {
  if (raw.length === 0) {
    return { created_ids: [], touched_event_ids: [] };
  }

  const prepared = dedupeSignalsByIdentity(raw);

  /*
   * 三个键都查：身份键管「同一篇原文」，external_id 管「源换了链接但还是同一条」，
   * 重发键管「源换了 URL 又发了一遍」。
   *
   * 重发键在 SQL 里没法直接表达（要按分钟和标题指纹比），所以这一段只把
   * 「同来源 + 落在本批时间跨度内」的行捞回来，真正的比对交给下面的内存 map。
   * 捞回的量受源在该窗口内的发文量约束，本批之外的行不会进来。
   */
  const publishedAt = prepared.map((p) => p.signal.published_at.getTime());
  const existing = await prisma.eventSignal.findMany({
    where: withTenantScope(tenantId, {
      connector,
      OR: [
        { external_id: { in: prepared.map((p) => p.signal.external_id) } },
        { canonical_url: { in: prepared.map((p) => p.canonical_url) } },
        {
          source_name: {
            in: [...new Set(prepared.map((p) => p.signal.source_name))],
          },
          published_at: {
            gte: new Date(publishedAt.reduce((a, b) => Math.min(a, b))),
            lte: new Date(publishedAt.reduce((a, b) => Math.max(a, b))),
          },
        },
      ],
    }),
    select: {
      id: true,
      external_id: true,
      source_name: true,
      canonical_url: true,
      title: true,
      published_at: true,
      removed_at: true,
      score: true,
      comment_count: true,
      excerpt: true,
      event_id: true,
    },
  });
  const existingByIdentity = new Map(
    existing.map((row) => [
      identityKey(row.source_name, row.canonical_url),
      row,
    ]),
  );
  const existingByExternalId = new Map(
    existing.map((row) => [row.external_id, row]),
  );
  const existingByRepublish = new Map(
    existing.flatMap((row) => {
      const key = republishKey(row);
      return key ? [[key, row] as const] : [];
    }),
  );

  const matchExisting = (item: PreparedSignal) => {
    const republish = republishKey(item.signal);
    return (
      existingByIdentity.get(
        identityKey(item.signal.source_name, item.canonical_url),
      ) ??
      existingByExternalId.get(item.signal.external_id) ??
      (republish ? existingByRepublish.get(republish) : undefined)
    );
  };

  const fresh = prepared.filter((item) => !matchExisting(item));

  /*
   * 目标页摘录**只为真正的新条目抓**，而且是在这里（去重之后）抓，不是在
   * connector 返回之后就整批抓。
   *
   * 源每轮返回的是同一份最近 N 条，其中绝大多数早就在库里了；在去重前抓，
   * 等于每 15 分钟把同一批文章页重新下载一遍（每篇最多 200KB），一天几万次。
   * 已入库但仍是空摘录的旧行由 `enrichStoredEmptyExcerpts` 限量补，不在这条路上。
   */
  await fillEmptyExcerpts(fresh.map((item) => item.signal));

  await prisma.eventSignal.createMany({
    data: fresh.map(({ signal, canonical_url }) => ({
      tenant_id: tenantId,
      connector,
      external_id: signal.external_id,
      source_name: signal.source_name,
      source_kind: signal.source_kind,
      title: signal.title,
      url: signal.url,
      canonical_url,
      excerpt: signal.excerpt,
      author: signal.author,
      topic: signal.topic,
      score: signal.score,
      comment_count: signal.comment_count,
      published_at: signal.published_at,
      // Prisma 的 Json 入参要求索引签名，而 IncidentUpdate[] 是具名结构；
      // 与 site-docs 写 localized label 同一处理
      ...(signal.incident_updates
        ? {
            incident_updates:
              signal.incident_updates as unknown as Prisma.InputJsonValue,
          }
        : {}),
    })),
    // 并发实例可能同时插同一条；唯一键（含身份键）让重复静默丢弃。
    // 重发键没有对应的唯一约束（要按分钟和指纹比），并发下仍可能漏进一条——
    // 概率极低（同一源同一分钟被两个实例同时抓到），代价只是多一格，不值得为它建列。
    skipDuplicates: true,
  });

  const createdRows = await prisma.eventSignal.findMany({
    where: withTenantScope(tenantId, {
      connector,
      external_id: { in: fresh.map((item) => item.signal.external_id) },
    }),
    select: { id: true },
  });

  // 已有信号：热度指标会变；摘录只在「原来没有可用摘录、现在有了」时补上，
  // 标题/时间仍不动，避免事件时间线在源改稿时跳来跳去。
  const touchedEventIds: string[] = [];
  const excerptImprovedEventIds: string[] = [];
  for (const item of prepared) {
    const row = matchExisting(item);
    if (!row) {
      continue;
    }
    /*
     * 命中一条已被工作台移除的信号：**什么都不做，这正是墓碑在起作用**。
     * 它挡住了 createMany 重建同一条（源每轮都还在发这篇），所以移除是一次性的，
     * 不会 15 分钟后复活。跳过更新则是不让它的热度变化把事件重新拉起来。
     */
    if (row.removed_at) {
      continue;
    }
    const { signal } = item;
    const excerpt = signal.excerpt.trim();
    const excerptImproved =
      isUsableExcerpt(excerpt, signal.title) &&
      !isUsableExcerpt(row.excerpt, signal.title);
    if (
      signal.score === row.score &&
      signal.comment_count === row.comment_count &&
      !excerptImproved
    ) {
      continue;
    }
    await prisma.eventSignal.update({
      where: { id: row.id },
      data: {
        score: signal.score,
        comment_count: signal.comment_count,
        ...(excerptImproved ? { excerpt } : {}),
      },
    });
    if (row.event_id) {
      touchedEventIds.push(row.event_id);
      if (excerptImproved) {
        excerptImprovedEventIds.push(row.event_id);
      }
    }
  }

  await clearAnalysisForExcerptUpgrade(tenantId, excerptImprovedEventIds);

  return {
    created_ids: createdRows.map((row) => row.id),
    touched_event_ids: touchedEventIds,
  };
}

async function findStaleEventIds(
  tenantId: string,
  now: Date,
): Promise<string[]> {
  const idleSince = new Date(
    now.getTime() - DECAY_SWEEP_IDLE_HOURS * 60 * 60 * 1000,
  );
  const rows = await prisma.newsEvent.findMany({
    where: withTenantScope(tenantId, {
      status: { in: ["developing", "active"] },
      last_activity_at: { lt: idleSince },
    }),
    select: { id: true },
    orderBy: { last_activity_at: "desc" },
    take: DECAY_SWEEP_LIMIT,
  });
  return rows.map((row) => row.id);
}

function toConnectorFeed(feed: {
  id: string;
  connector: string;
  name: string;
  url: string;
  source_kind: string;
  topic: string;
}): ConnectorFeed {
  return {
    id: feed.id,
    connector: feed.connector,
    name: feed.name,
    url: feed.url,
    source_kind: feed.source_kind as EventSourceKind,
    topic: feed.topic as EventTopic,
  };
}
