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
const WINDOW_DAYS = 90;
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

  const sameEntity = withTenantScope(input.tenant_id, {
    id: { not: input.event_id },
    first_seen_at: { gte: cutoff },
    entities: { some: { entity_id: input.entity_id } },
  });

  const [others, sameKind, previous] = await Promise.all([
    prisma.newsEvent.count({ where: sameEntity }),
    input.kind
      ? prisma.newsEvent.aggregate({
          where: { ...sameEntity, kind: input.kind },
          _count: true,
          _sum: { fact_duration_minutes: true },
        })
      : null,
    // 「上一次」只看**更早**的那些：一件比它新的事不叫上一次
    prisma.newsEvent.findFirst({
      where: {
        ...sameEntity,
        ...(input.kind ? { kind: input.kind } : {}),
        first_seen_at: { gte: cutoff, lt: input.first_seen_at },
      },
      orderBy: { first_seen_at: "desc" },
      select: { slug: true, title: true, first_seen_at: true },
    }),
  ]);

  const facts: EventPlacementFact[] = [];

  if (others > 0) {
    facts.push({
      code: "placement.recurrence",
      params: {
        entity: input.entity_name,
        days: WINDOW_DAYS,
        // 加上本事件自己：读者看到的「第 N 次」里，眼前这条也算一次
        count: others + 1,
      },
    });
  }

  if (input.kind && sameKind && sameKind._count > 0) {
    facts.push({
      code: "placement.kindRecurrence",
      params: {
        entity: input.entity_name,
        days: WINDOW_DAYS,
        count: sameKind._count + 1,
        kind: `kind.${input.kind}`,
      },
    });

    /*
     * 累计时长只对故障给，而且只加**同类型别的事件**的时长——本事件自己的时长
     * 已经在 chips 上写着了，再加进来会让两个数字互相矛盾。
     */
    const total = sameKind._sum.fact_duration_minutes ?? 0;
    if (input.kind === "outage" && total > 0) {
      facts.push({
        code: "placement.outageTotal",
        params: { minutes: total },
      });
    }
  }

  if (previous) {
    const days = Math.floor(
      (input.first_seen_at.getTime() - previous.first_seen_at.getTime()) / DAY_MS,
    );
    facts.push({
      // 不足一天时不写「0 天前」——那读起来像没算出来
      code: days < 1 ? "placement.previousToday" : "placement.previous",
      params: { days, title: previous.title },
      // service 不知道自己在哪一面，两侧各自拼地址
      event_slug: previous.slug,
    });
  }

  return facts;
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
