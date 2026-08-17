import { randomUUID } from "node:crypto";

import { prisma, withTenantScope } from "@rewindom/module-sdk/server";

import { pickBestCluster } from "./cluster-match.js";
import { buildEventSlug } from "./slug.js";
import { buildFingerprint, tokenizeTitle } from "./title-tokens.js";

/** 只在这个时间窗内找归属：三天前的事件再来一条信号，多半是新一轮而非同一轮。 */
const CANDIDATE_WINDOW_HOURS = 72;
/** 候选上限。相似度是 O(候选数) 的，窗口内事件再多也不该让一条信号扫全表。 */
const CANDIDATE_LIMIT = 200;

export interface ClusterableSignal {
  id: string;
  tenant_id: string;
  title: string;
  topic: string;
  canonical_url: string;
  published_at: Date;
}

/**
 * 把新信号挂到事件上，返回被动过的事件 id 集合。
 *
 * 按时间升序处理：先到的信号先立事件，后到的才有机会并进来——
 * 反过来会让「后续报道」立事件、「原始公告」变成它的附属。
 *
 * 只在同一站点内聚类：不同站点即使抓到同一篇原文，也是各自的事件。
 */
export async function clusterSignals(
  signals: readonly ClusterableSignal[],
): Promise<Set<string>> {
  const touched = new Set<string>();

  const ordered = [...signals].sort(
    (a, b) => a.published_at.getTime() - b.published_at.getTime(),
  );

  for (const signal of ordered) {
    const eventId = await resolveEventForSignal(signal);
    await prisma.eventSignal.update({
      where: { id: signal.id },
      data: { event_id: eventId },
    });
    touched.add(eventId);
  }

  return touched;
}

async function resolveEventForSignal(
  signal: ClusterableSignal,
): Promise<string> {
  // 1. 同一篇原文已经归属过——URL 相等是最硬的证据，先于任何文本相似度
  const sibling = await prisma.eventSignal.findFirst({
    where: withTenantScope(signal.tenant_id, {
      canonical_url: signal.canonical_url,
      event_id: { not: null },
      id: { not: signal.id },
    }),
    select: { event_id: true },
  });
  if (sibling?.event_id) {
    return sibling.event_id;
  }

  const tokens = tokenizeTitle(signal.title);

  // 2. 近窗口内同主题事件里找最像的
  const cutoff = new Date(
    signal.published_at.getTime() - CANDIDATE_WINDOW_HOURS * 60 * 60 * 1000,
  );
  const candidates = await prisma.newsEvent.findMany({
    where: withTenantScope(signal.tenant_id, {
      topic: signal.topic,
      last_activity_at: { gte: cutoff },
    }),
    select: { id: true, tokens: true },
    orderBy: { last_activity_at: "desc" },
    take: CANDIDATE_LIMIT,
  });
  const matched = pickBestCluster(tokens, candidates);
  if (matched) {
    return matched;
  }

  // 3. 另起一个事件
  return createEvent(signal, tokens);
}

async function createEvent(
  signal: ClusterableSignal,
  tokens: string[],
): Promise<string> {
  // 标题分不出任何有效词时，指纹退化成一条信号一个事件——
  // 否则所有「无词标题」会因为指纹相同被硬塞进同一个事件
  const fingerprint =
    tokens.length > 0
      ? buildFingerprint(signal.topic, tokens)
      : `${signal.topic}:signal:${signal.id}`;

  const existing = await prisma.newsEvent.findUnique({
    where: {
      tenant_id_fingerprint: {
        tenant_id: signal.tenant_id,
        fingerprint,
      },
    },
    select: { id: true },
  });
  if (existing) {
    return existing.id;
  }

  const id = randomUUID();
  try {
    const created = await prisma.newsEvent.create({
      data: {
        id,
        tenant_id: signal.tenant_id,
        slug: buildEventSlug(signal.title, id),
        title: signal.title,
        topic: signal.topic,
        status: "developing",
        fingerprint,
        tokens,
        source_names: [],
        first_seen_at: signal.published_at,
        last_activity_at: signal.published_at,
      },
      select: { id: true },
    });
    return created.id;
  } catch (err) {
    // 并发采集下两个 worker 可能同时算出同一个指纹；唯一约束赢的那个就是答案
    const conflicted = await prisma.newsEvent.findUnique({
      where: {
        tenant_id_fingerprint: {
          tenant_id: signal.tenant_id,
          fingerprint,
        },
      },
      select: { id: true },
    });
    if (conflicted) {
      return conflicted.id;
    }
    throw err;
  }
}
