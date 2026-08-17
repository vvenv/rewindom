import { prisma } from "@rewindom/module-sdk/server";

import { canonicalizeUrl } from "../event/canonical-url.js";
import { clusterSignals } from "../event/cluster.service.js";
import { refreshEvents } from "../event/event-refresh.service.js";

import { DEFAULT_FEEDS } from "./feed-catalog.js";
import { hackerNewsConnector } from "./hacker-news.connector.js";
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
}

/**
 * 跑一轮采集：抓取 → 落信号 → 聚类 → 重算事件。
 *
 * 单个源失败不影响其它源：错误记进 EventFeed.last_error 并计入 summary，
 * 一个挂掉的 RSS 不该让整轮采集归零。
 */
export async function runIngest(options?: {
  now?: Date;
  log?: FastifyBaseLogger;
}): Promise<IngestSummary> {
  const now = options?.now ?? new Date();
  await ensureDefaultFeeds();

  const feeds = await prisma.eventFeed.findMany({
    where: { enabled: true },
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

      const result = await persistSignals(feed.connector, raw);
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
      options?.log?.warn({ err, feed: feed.name }, "[events] 采集源抓取失败");
      await prisma.eventFeed.update({
        where: { id: feed.id },
        data: { last_fetched_at: now, last_error: message.slice(0, 500) },
      });
    }
  }

  const created = await prisma.eventSignal.findMany({
    where: { id: { in: newSignalIds } },
    select: {
      id: true,
      title: true,
      topic: true,
      canonical_url: true,
      published_at: true,
    },
  });

  const touched = await clusterSignals(created);
  for (const eventId of changedSignalEventIds) {
    touched.add(eventId);
  }
  for (const eventId of await findStaleEventIds(now)) {
    touched.add(eventId);
  }

  await refreshEvents(touched, {
    now,
    onAnalyzerFallback: (eventId, err) => {
      options?.log?.warn({ err, eventId }, "[events] LLM 分析失败，已退回规则分析器");
    },
  });

  return {
    feeds: feeds.length,
    fetched,
    created: newSignalIds.length,
    events_touched: touched.size,
    failures,
  };
}

/** 内置目录只新建、不覆盖：运维在库里禁用或改过的源不该被下次启动重新打开。 */
export async function ensureDefaultFeeds(): Promise<void> {
  await prisma.eventFeed.createMany({
    data: DEFAULT_FEEDS.map((feed) => ({ ...feed })),
    skipDuplicates: true,
  });
}

interface PersistResult {
  created_ids: string[];
  /** 已有信号的指标发生变化（HN 涨分）时，其所属事件也要重算热度 */
  touched_event_ids: string[];
}

async function persistSignals(
  connector: string,
  raw: readonly RawSignal[],
): Promise<PersistResult> {
  if (raw.length === 0) {
    return { created_ids: [], touched_event_ids: [] };
  }

  // 同一轮里源自己可能重复给同一条（分页重叠），先按 external_id 去重
  const byExternalId = new Map<string, RawSignal>();
  for (const signal of raw) {
    byExternalId.set(signal.external_id, signal);
  }
  const externalIds = [...byExternalId.keys()];

  const existing = await prisma.eventSignal.findMany({
    where: { connector, external_id: { in: externalIds } },
    select: {
      id: true,
      external_id: true,
      score: true,
      comment_count: true,
      event_id: true,
    },
  });
  const existingByExternalId = new Map(existing.map((row) => [row.external_id, row]));

  const fresh = externalIds
    .filter((id) => !existingByExternalId.has(id))
    .map((id) => byExternalId.get(id)!);

  await prisma.eventSignal.createMany({
    data: fresh.map((signal) => ({
      connector,
      external_id: signal.external_id,
      source_name: signal.source_name,
      source_kind: signal.source_kind,
      title: signal.title,
      url: signal.url,
      canonical_url: canonicalizeUrl(signal.url),
      excerpt: signal.excerpt,
      author: signal.author,
      topic: signal.topic,
      score: signal.score,
      comment_count: signal.comment_count,
      published_at: signal.published_at,
    })),
    skipDuplicates: true,
  });

  const createdRows = await prisma.eventSignal.findMany({
    where: {
      connector,
      external_id: { in: fresh.map((signal) => signal.external_id) },
    },
    select: { id: true },
  });

  // 已有信号只更新会变的两个指标；标题/时间不动，避免事件时间线在源改稿时跳来跳去
  const touchedEventIds: string[] = [];
  for (const row of existing) {
    const signal = byExternalId.get(row.external_id);
    if (!signal) {
      continue;
    }
    if (signal.score === row.score && signal.comment_count === row.comment_count) {
      continue;
    }
    await prisma.eventSignal.update({
      where: { id: row.id },
      data: { score: signal.score, comment_count: signal.comment_count },
    });
    if (row.event_id) {
      touchedEventIds.push(row.event_id);
    }
  }

  return {
    created_ids: createdRows.map((row) => row.id),
    touched_event_ids: touchedEventIds,
  };
}

async function findStaleEventIds(now: Date): Promise<string[]> {
  const idleSince = new Date(now.getTime() - DECAY_SWEEP_IDLE_HOURS * 60 * 60 * 1000);
  const rows = await prisma.newsEvent.findMany({
    where: {
      status: { in: ["developing", "active"] },
      last_activity_at: { lt: idleSince },
    },
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
