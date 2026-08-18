import { prisma, withTenantScope } from "@rewindom/module-sdk/server";

import { TENANT_MODULES_STORAGE_KEY } from "@rewindom/builtin/platform/shared/tenant-modules.js";

import { canonicalizeUrl } from "../event/canonical-url.js";
import { isEventsModuleEnabled } from "../lib/entitlement.js";
import { clusterSignals } from "../event/cluster.service.js";
import { refreshEvents } from "../event/event-refresh.service.js";
import { syncRelatedEvents } from "../event/related.service.js";

import { enrichStoredEmptyExcerpts } from "./excerpt-enrichment.js";
import { ensureDefaultFeeds } from "./feed-seed.js";
import { hackerNewsConnector } from "./hacker-news.connector.js";
import { fillEmptyExcerpts, isUsableExcerpt } from "./page-excerpt.js";
import { rssConnector } from "./rss.connector.js";

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
  };

  for (const tenantId of tenantIds) {
    const part = await runIngestForTenant(tenantId, now, options?.log);
    summary.feeds += part.feeds;
    summary.fetched += part.fetched;
    summary.created += part.created;
    summary.events_touched += part.events_touched;
    summary.failures.push(...part.failures);
  }

  return summary;
}

async function runIngestForTenant(
  tenantId: string,
  now: Date,
  log?: FastifyBaseLogger,
): Promise<Omit<IngestSummary, "tenants">> {
  await ensureDefaultFeeds(tenantId);

  const feeds = await prisma.eventFeed.findMany({
    where: withTenantScope(tenantId, { enabled: true }),
    orderBy: { created_at: "asc" },
  });

  const failures: IngestFailure[] = [];
  const newSignalIds: string[] = [];
  const changedSignalEventIds = new Set<string>();
  let fetched = 0;

  for (const feed of feeds) {
    const connector = CONNECTORS[feed.connector];
    if (!connector) {
      failures.push({ feed: feed.name, error: `未知 connector：${feed.connector}` });
      continue;
    }

    try {
      const raw = await connector.fetch(toConnectorFeed(feed));
      fetched += raw.length;
      await fillEmptyExcerpts(raw);

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
      log?.warn({ err, eventId, tenantId }, "[events] LLM 分析失败，已退回规则分析器");
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

/** 同一轮抓取内部去重（源分页重叠、或同一篇给了两个 guid）。 */
export function dedupeSignalsByIdentity(
  raw: readonly RawSignal[],
): PreparedSignal[] {
  const byIdentity = new Map<string, PreparedSignal>();
  for (const signal of raw) {
    const canonical_url = canonicalizeUrl(signal.url);
    const key = identityKey(signal.source_name, canonical_url);
    // 保留先出现的那条：源的排序通常把原始条目放在修订条目之前
    if (!byIdentity.has(key)) {
      byIdentity.set(key, { signal, canonical_url });
    }
  }
  return [...byIdentity.values()];
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

  // 两个键都查：身份键管「同一篇原文」，external_id 管「源换了链接但还是同一条」
  const existing = await prisma.eventSignal.findMany({
    where: withTenantScope(tenantId, {
      connector,
      OR: [
        { external_id: { in: prepared.map((p) => p.signal.external_id) } },
        { canonical_url: { in: prepared.map((p) => p.canonical_url) } },
      ],
    }),
    select: {
      id: true,
      external_id: true,
      source_name: true,
      canonical_url: true,
      score: true,
      comment_count: true,
      excerpt: true,
      event_id: true,
    },
  });
  const existingByIdentity = new Map(
    existing.map((row) => [identityKey(row.source_name, row.canonical_url), row]),
  );
  const existingByExternalId = new Map(
    existing.map((row) => [row.external_id, row]),
  );

  const matchExisting = (item: PreparedSignal) =>
    existingByIdentity.get(
      identityKey(item.signal.source_name, item.canonical_url),
    ) ?? existingByExternalId.get(item.signal.external_id);

  const fresh = prepared.filter((item) => !matchExisting(item));

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
    })),
    // 并发实例可能同时插同一条；唯一键（含身份键）让重复静默丢弃
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

  if (excerptImprovedEventIds.length > 0) {
    await prisma.newsEvent.updateMany({
      where: withTenantScope(tenantId, { id: { in: excerptImprovedEventIds } }),
      data: { analyzed_at: null },
    });
  }

  return {
    created_ids: createdRows.map((row) => row.id),
    touched_event_ids: touchedEventIds,
  };
}

async function findStaleEventIds(
  tenantId: string,
  now: Date,
): Promise<string[]> {
  const idleSince = new Date(now.getTime() - DECAY_SWEEP_IDLE_HOURS * 60 * 60 * 1000);
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
