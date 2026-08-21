/**
 * 归位——把一条材料放回该实体的连续记录里。
 *
 * 一条孤立报道价值低，根子不是「只有一个来源」，是**没有上下文**。而上下文我们有：
 * 语料库 + 实体图 + `kind` / `fact_duration_minutes`。缺的只是查出来摆在旁边：
 *
 *   Cloudflare 近 90 天第 4 次故障，累计 3h12m
 *   上一次：11 天前 · Elevated error rates in WAF
 *
 * 两行都没有一个字是编的，而原文只给你标题。**一条信号都不用多**——
 * 正好作用在那 97.8% 的单信号事件上，合并对它们本来就不成立。
 *
 * 竞品结构上给不出这两行：Techmeme / Google News 每轮重新聚类，没有连续观察记录，
 * 答不出「这家上次出现是什么时候」。与 EventRevision 是同一个护城河的另一面。
 *
 * 与 why-trending 同一条硬约束：**产出 i18n code + 参数，不是自由文案**。
 * 只陈述可核对的计数与时刻，不比较、不评价、不预测——「这家最近很不稳定」
 * 是判断，不是事实。
 */
import { prisma, withTenantScope } from "@rewindom/module-sdk/server";

import { isEventKind } from "../../shared/index.js";

import type { EventKind, EventPlacementFact } from "../../shared/index.js";

/**
 * 回看窗口。
 *
 * 比 related 的 30 天宽：归位问的是「这家一直在出什么事」，本来就该跨更长的跨度。
 * 比事件保留期（180 天）窄：不把快被清理的行算进来，否则数字会在某天悄悄变小。
 */
/**
 * 导出给实体页档案共用。**两处不许各写一个数**：详情页说「近 90 天第 4 次」
 * 而实体页按 60 天算，两个数字对不上会立刻被读者发现，而这种漂移极难查。
 */
export const PLACEMENT_WINDOW_DAYS = 90;
const WINDOW_DAYS = PLACEMENT_WINDOW_DAYS;
const DAY_MS = 86_400_000;

export interface EventPlacementInput {
  tenant_id: string;
  event_id: string;
  kind: EventKind | null;
  /** 主实体——链接里 mention_count 最高的那个。没有实体时不要调用 */
  entity_id: string;
  entity_name: string;
  /** 本事件的起点，用来算「上一次」隔了多久 */
  first_seen_at: Date;
  /** 只有测试会显式传 */
  now?: Date;
}

const PLACEMENT_PEER_SELECT = {
  id: true,
  kind: true,
  first_seen_at: true,
  slug: true,
  title: true,
  fact_duration_minutes: true,
} as const;

export interface PlacementPeer {
  id: string;
  kind: string | null;
  first_seen_at: Date;
  slug: string;
  title: string;
  fact_duration_minutes: number | null;
}

/**
 * 归位事实的纯函数。详情一次查、列表批量查，两边必须走这一份——
 * 卡片上的「第 4 次」和详情页对不上会立刻被发现。
 */
export function buildPlacementFacts(input: {
  event_id: string;
  kind: EventKind | null;
  entity_name: string;
  first_seen_at: Date;
  peers: readonly PlacementPeer[];
}): EventPlacementFact[] {
  const others = input.peers.filter((peer) => peer.id !== input.event_id);
  const facts: EventPlacementFact[] = [];

  if (others.length > 0) {
    facts.push({
      code: "placement.recurrence",
      params: {
        entity: input.entity_name,
        days: WINDOW_DAYS,
        count: others.length + 1,
      },
    });
  }

  if (input.kind) {
    const sameKind = others.filter((peer) => peer.kind === input.kind);
    if (sameKind.length > 0) {
      facts.push({
        code: "placement.kindRecurrence",
        params: {
          entity: input.entity_name,
          days: WINDOW_DAYS,
          count: sameKind.length + 1,
          kind: `kind.${input.kind}`,
        },
      });

      const total = sameKind.reduce(
        (sum, peer) => sum + (peer.fact_duration_minutes ?? 0),
        0,
      );
      if (input.kind === "outage" && total > 0) {
        facts.push({
          code: "placement.outageTotal",
          params: { minutes: total },
        });
      }
    }
  }

  const previous = others
    .filter(
      (peer) =>
        peer.first_seen_at.getTime() < input.first_seen_at.getTime() &&
        (!input.kind || peer.kind === input.kind),
    )
    .sort((a, b) => b.first_seen_at.getTime() - a.first_seen_at.getTime())[0];

  if (previous) {
    const days = Math.floor(
      (input.first_seen_at.getTime() - previous.first_seen_at.getTime()) /
        DAY_MS,
    );
    facts.push({
      code: days < 1 ? "placement.previousToday" : "placement.previous",
      params: { days, title: previous.title },
      event_slug: previous.slug,
    });
  }

  return facts;
}

/**
 * 三次带索引的聚合，合并进详情页现有的 Promise.all。
 *
 * **读路径上算，不预计算**——与 related_event_ids 的取舍相反，理由也相反：
 * related 要把候选的 centroid 全部载入（几 MB/请求），这里只是计数；
 * 而预计算会让它过期，一条新故障进来旧详情页的「第 4 次」应该立刻变成第 5 次。
 */
export async function getEventPlacement(
  input: EventPlacementInput,
): Promise<EventPlacementFact[]> {
  const now = input.now ?? new Date();
  const cutoff = new Date(now.getTime() - WINDOW_DAYS * DAY_MS);

  const peers = await prisma.newsEvent.findMany({
    where: withTenantScope(input.tenant_id, {
      first_seen_at: { gte: cutoff },
      entities: { some: { entity_id: input.entity_id } },
    }),
    select: PLACEMENT_PEER_SELECT,
  });

  return buildPlacementFacts({
    event_id: input.event_id,
    kind: input.kind,
    entity_name: input.entity_name,
    first_seen_at: input.first_seen_at,
    peers,
  });
}

/**
 * 列表页的归位：两轮查询，不是 N×3。
 *
 * 首页 Rising + Now 合成一批再调用。没有实体的事件得到空数组，卡片保持薄。
 */
export async function getEventPlacementsForList(params: {
  tenant_id: string;
  events: readonly {
    id: string;
    kind: string | null;
    first_seen_at: Date;
  }[];
  now?: Date;
}): Promise<Map<string, EventPlacementFact[]>> {
  const result = new Map<string, EventPlacementFact[]>();
  for (const event of params.events) {
    result.set(event.id, []);
  }
  if (params.events.length === 0) {
    return result;
  }

  const now = params.now ?? new Date();
  const cutoff = new Date(now.getTime() - WINDOW_DAYS * DAY_MS);
  const eventIds = params.events.map((event) => event.id);

  const links = await prisma.eventEntityLink.findMany({
    where: withTenantScope(params.tenant_id, { event_id: { in: eventIds } }),
    orderBy: { mention_count: "desc" },
    select: {
      event_id: true,
      entity: { select: { id: true, name: true } },
    },
  });

  const primaryByEvent = new Map<string, { id: string; name: string }>();
  for (const link of links) {
    if (!primaryByEvent.has(link.event_id)) {
      primaryByEvent.set(link.event_id, link.entity);
    }
  }

  const entityIds = [
    ...new Set([...primaryByEvent.values()].map((entity) => entity.id)),
  ];
  if (entityIds.length === 0) {
    return result;
  }

  const peers = await prisma.newsEvent.findMany({
    where: withTenantScope(params.tenant_id, {
      first_seen_at: { gte: cutoff },
      entities: { some: { entity_id: { in: entityIds } } },
    }),
    select: {
      ...PLACEMENT_PEER_SELECT,
      entities: { select: { entity_id: true } },
    },
  });

  for (const event of params.events) {
    const primary = primaryByEvent.get(event.id);
    if (!primary) {
      continue;
    }
    result.set(
      event.id,
      buildPlacementFacts({
        event_id: event.id,
        kind: isEventKind(event.kind) ? event.kind : null,
        entity_name: primary.name,
        first_seen_at: event.first_seen_at,
        peers: peers.filter((peer) =>
          peer.entities.some((link) => link.entity_id === primary.id),
        ),
      }),
    );
  }

  return result;
}

/**
 * 详情页的入口：挑主实体、没有就留白。
 *
 * 工作台与公开面都走这一个函数——两面给出不同的数字会立刻被读者发现，
 * 而这种漂移一旦发生很难查。
 *
 * 主实体取 `mention_count` 最高的那个（`listEventEntities` 已经按它排序）。
 * **没有实体就返回空数组**：实体抽取刻意保守（覆盖率约 36%），留白比挂到一个
 * 抽错的实体上强得多——错的实体会把这条材料放进不相干的记录里，而读者没法核对。
 */
export async function getEventPlacementForDetail(params: {
  tenant_id: string;
  event: {
    id: string;
    kind: string | null;
    first_seen_at: Date;
  };
  entities: readonly { entity: { id: string; name: string } }[];
  now?: Date;
}): Promise<EventPlacementFact[]> {
  const primary = params.entities[0]?.entity;
  if (!primary) {
    return [];
  }
  return getEventPlacement({
    tenant_id: params.tenant_id,
    event_id: params.event.id,
    kind: isEventKind(params.event.kind) ? params.event.kind : null,
    entity_id: primary.id,
    entity_name: primary.name,
    first_seen_at: params.event.first_seen_at,
    now: params.now,
  });
}
