/**
 * 实体页的累计档案。
 *
 * 实体页现在是「这是谁 + 它涉及哪些事件」——一个按时间排的列表。但实体页真正的
 * 价值在**累计**，不在列表：读者要的不是「Cloudflare 最近有哪些新闻」，是
 * 「这家近 90 天出过几次故障、累计多久」。那是续约谈判、事故复盘、选型评审上
 * 拿得出手的证据，而今天没有人给他——状态页自己会清历史，且只显示自己那一家。
 *
 * 与归位是同一个查询的两问：归位问「这条材料在该实体的记录里排第几」，
 * 档案问「该实体的记录长什么样」。所以窗口常量共用一个，不许各写一个数。
 *
 * 同一条硬约束：**产出 i18n code + 参数，不是自由文案**。只报计数与时长，
 * 不写「比上季度更稳定」这类比较——那是判断，不是事实。
 */
import { prisma, withTenantScope } from "@rewindom/module-sdk/server";

import { PLACEMENT_WINDOW_DAYS } from "./placement.service.js";

import { isEventKind } from "../../shared/index.js";

import type { EventPlacementFact } from "../../shared/index.js";

const DAY_MS = 86_400_000;

/**
 * 少于两件事时整块不渲染。
 *
 * 「近 90 天 1 件事」是噪音，而实体图里大量实体只关联一个事件——实体抽取刻意保守，
 * 长尾很长。留白比给一个等于零信息的数字强。
 */
const MIN_EVENTS = 2;

export interface EntityProfileInput {
  tenant_id: string;
  entity_slug: string;
  /**
   * 与实体页事件列表**同一个**过滤条件（`enabledTopicWhere`）。
   * 档案里数了 12 件事、下面的列表只列出 8 件，读者会以为页面坏了。
   */
  event_filter: Record<string, unknown>;
  /** 只有测试会显式传 */
  now?: Date;
}

export async function getEntityProfile(
  input: EntityProfileInput,
): Promise<EventPlacementFact[]> {
  const now = input.now ?? new Date();
  const cutoff = new Date(now.getTime() - PLACEMENT_WINDOW_DAYS * DAY_MS);

  // 一次 groupBy 拿全部：各类型次数 + 故障累计时长。不要按类型各查一次
  const groups = await prisma.newsEvent.groupBy({
    by: ["kind"],
    where: withTenantScope(input.tenant_id, {
      ...input.event_filter,
      first_seen_at: { gte: cutoff },
      entities: { some: { entity: { slug: input.entity_slug } } },
    }),
    _count: true,
    _sum: { fact_duration_minutes: true },
  });

  const total = groups.reduce((sum, group) => sum + group._count, 0);
  if (total < MIN_EVENTS) {
    return [];
  }

  const facts: EventPlacementFact[] = [
    {
      code: "profile.window",
      params: { days: PLACEMENT_WINDOW_DAYS, count: total },
    },
  ];

  /*
   * 判不出类型的**只计入总数，不单独列一行**。「未分类 806 次」不是一个类型，
   * 写出来只是把「我们判不出来」放大成一个品类。
   */
  const typed = groups
    .filter((group) => isEventKind(group.kind))
    .sort((a, b) => b._count - a._count);

  for (const group of typed) {
    facts.push({
      code: "profile.kindCount",
      // kind 本身是个嵌套 code，落成文案是渲染侧的事
      params: { kind: `kind.${group.kind}`, count: group._count },
    });
  }

  const outageMinutes =
    typed.find((group) => group.kind === "outage")?._sum
      .fact_duration_minutes ?? 0;
  if (outageMinutes > 0) {
    facts.push({
      code: "profile.outageTotal",
      params: { minutes: outageMinutes },
    });
  }

  return facts;
}
