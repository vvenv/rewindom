/**
 * 事件修订史——「自你上次看之后发生了什么」。
 *
 * 现在 `EventFollow.last_seen_at` 只能推出一个布尔（有更新 / 没更新）。
 * 这一层把变化本身记下来，于是能回答：官方发了公告、又有 3 家来源跟进、
 * 阶段从 developing 变成 active、摘要因为新证据被改写。
 *
 * **只追加，永不更新**。它是观察记录，不是当前状态的副本——当前状态在 NewsEvent 上。
 * 竞品做不到这件事是结构性的：每轮重新聚类的产品没有连续观察记录，事后补算不出来。
 */
import { prisma, withTenantScope } from "@rewindom/module-sdk/server";

import type { EventSourceKind } from "../../shared/index.js";

export const EVENT_REVISION_KINDS = [
  "source_joined",
  "status_changed",
  "summary_rewritten",
  "title_changed",
] as const;
export type EventRevisionKind = (typeof EVENT_REVISION_KINDS)[number];

/**
 * 修订载荷。刻意限定成**扁平的标量映射**：它要直接落进 Json 列，
 * 也要能被渲染层无脑读取；嵌套结构会让「渲染一条 diff」变成一个解析问题。
 */
export type EventRevisionPayload = Record<string, string | number | boolean | null>;

export interface EventRevisionDraft {
  kind: EventRevisionKind;
  before: EventRevisionPayload | null;
  after: EventRevisionPayload;
  occurred_at: Date;
}

/** 比对用的事件快照——只取会产生修订的那几个字段。 */
export interface EventSnapshot {
  title: string;
  summary: string;
  status: string;
  source_names: string[];
}

export interface RevisionSignal {
  source_name: string;
  source_kind: EventSourceKind;
  published_at: Date;
}

/**
 * 算出这一轮该记哪些修订。纯函数，不碰数据库——数据库那层只负责把它们插进去。
 *
 * `occurred_at` 一律取**可核对的时刻**：来源加入取该来源第一条信号的发布时间，
 * 其余取本轮刷新时刻。绝不编造时间戳（与分析器同一条硬约束）。
 */
export function diffEventRevisions(params: {
  before: EventSnapshot;
  after: EventSnapshot;
  signals: readonly RevisionSignal[];
  now: Date;
}): EventRevisionDraft[] {
  const drafts: EventRevisionDraft[] = [];
  const { before, after, signals, now } = params;

  // 1. 新来源加入——最有价值的一类：它把「跨源印证」变成了带时刻的事实
  const known = new Set(before.source_names);
  for (const source of after.source_names) {
    if (known.has(source)) {
      continue;
    }
    const first = firstSignalOf(signals, source);
    if (!first) {
      continue;
    }
    drafts.push({
      kind: "source_joined",
      before: null,
      after: {
        source_name: source,
        source_kind: first.source_kind,
        // 相对事件首条信号的滞后，渲染「BBC 最先报道，TechCrunch 2h17m 后跟进」
        // 时不必回查信号表
        lag_ms: first.published_at.getTime() - eventStartedAt(signals),
      },
      occurred_at: first.published_at,
    });
  }

  if (before.status !== after.status) {
    drafts.push({
      kind: "status_changed",
      before: { status: before.status },
      after: { status: after.status },
      occurred_at: now,
    });
  }

  // 2. 文案变化按规范化后的文本比对。
  //    heuristic 每轮都重算，绝大多数时候产出同一串字符——那不是变更，
  //    用 analyzed_at 判断会把每一轮都记成一次改写。
  if (normalize(before.title) !== normalize(after.title)) {
    drafts.push({
      kind: "title_changed",
      before: { title: before.title },
      after: { title: after.title },
      occurred_at: now,
    });
  }
  if (normalize(before.summary) !== normalize(after.summary)) {
    drafts.push({
      kind: "summary_rewritten",
      before: { summary: before.summary },
      after: { summary: after.summary },
      occurred_at: now,
    });
  }

  return drafts;
}

function firstSignalOf(
  signals: readonly RevisionSignal[],
  sourceName: string,
): RevisionSignal | null {
  let best: RevisionSignal | null = null;
  for (const signal of signals) {
    if (signal.source_name !== sourceName) {
      continue;
    }
    if (best === null || signal.published_at < best.published_at) {
      best = signal;
    }
  }
  return best;
}

function eventStartedAt(signals: readonly RevisionSignal[]): number {
  return signals.length === 0
    ? 0
    : Math.min(...signals.map((signal) => signal.published_at.getTime()));
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/gu, " ");
}

/* ---------------------------------------------------------------- 读取 */

/** 公开面没有 viewer，看的是「最近这段时间的变化」而不是「自我上次看之后」。 */
export const PUBLIC_REVISION_WINDOW_HOURS = 24;
/** 一次最多回多少条——事件页只想说「变了什么」，不是一本流水账。 */
const REVISION_LIMIT = 20;

export interface EventRevisionRecord {
  kind: string;
  before: unknown;
  after: unknown;
  occurred_at: Date;
}

/**
 * 取一个事件在 `since` 之后的修订。
 *
 * 工作台/会员面传 `EventFollow.last_seen_at`，公开面传「24 小时前」——
 * 两条路径共用这一个函数，只是 `since` 的来源不同。
 */
export async function listEventRevisions(params: {
  tenant_id: string;
  event_id: string;
  since: Date;
}): Promise<EventRevisionRecord[]> {
  return prisma.eventRevision.findMany({
    where: withTenantScope(params.tenant_id, {
      event_id: params.event_id,
      occurred_at: { gt: params.since },
    }),
    orderBy: { occurred_at: "desc" },
    take: REVISION_LIMIT,
    select: { kind: true, before: true, after: true, occurred_at: true },
  });
}

export function publicRevisionSince(now: Date): Date {
  return new Date(now.getTime() - PUBLIC_REVISION_WINDOW_HOURS * 60 * 60 * 1000);
}
