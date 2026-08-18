import {
  NotFoundError,
  prisma,
  withTenantScope,
} from "@rewindom/module-sdk/server";

import { countEntityFollowUpdates } from "./entity-follow.service.js";

import type { EventFollowState } from "../../shared/index.js";

export interface FollowParams {
  tenant_id: string;
  user_id: string;
  event_id: string;
}

/**
 * 关注事件。
 *
 * MVP §8 把 Follow 当成留存机制的核心：关注之后事件有进展才有「Update」可推。
 * 刚关注时把 last_seen_at 设成当下——不然用户一关注就立刻看到「有更新」，
 * 那条提示会立刻失去意义。
 */
export async function followEvent(params: FollowParams): Promise<EventFollowState> {
  const event = await requireEvent(params.tenant_id, params.event_id);
  const now = new Date();

  const record = await prisma.eventFollow.upsert({
    where: {
      tenant_id_user_id_event_id: {
        tenant_id: params.tenant_id,
        user_id: params.user_id,
        event_id: event.id,
      },
    },
    create: {
      tenant_id: params.tenant_id,
      user_id: params.user_id,
      event_id: event.id,
      last_seen_at: now,
    },
    // 已关注时重复调用是幂等的，不要把 last_seen_at 往前推掉未读更新
    update: {},
    select: { last_seen_at: true },
  });

  return toFollowState(record.last_seen_at, event.last_activity_at);
}

export async function unfollowEvent(params: FollowParams): Promise<void> {
  const event = await requireEvent(params.tenant_id, params.event_id);
  await prisma.eventFollow.deleteMany({
    where: withTenantScope(params.tenant_id, {
      user_id: params.user_id,
      event_id: event.id,
    }),
  });
}

/**
 * 标记「已看到这里」。详情页打开时调用，之后 last_activity_at 再往前走才算新更新。
 * 没关注的事件直接忽略——不给未关注用户建关注记录。
 */
export async function markEventSeen(
  params: FollowParams,
): Promise<EventFollowState> {
  const event = await requireEvent(params.tenant_id, params.event_id);
  const now = new Date();

  const updated = await prisma.eventFollow.updateMany({
    where: withTenantScope(params.tenant_id, {
      user_id: params.user_id,
      event_id: event.id,
    }),
    data: { last_seen_at: now },
  });

  if (updated.count === 0) {
    return { is_following: false, has_update: false, last_seen_at: null };
  }
  return toFollowState(now, event.last_activity_at);
}

export async function getFollowState(
  params: FollowParams,
): Promise<EventFollowState> {
  const event = await requireEvent(params.tenant_id, params.event_id);
  const record = await prisma.eventFollow.findFirst({
    where: withTenantScope(params.tenant_id, {
      user_id: params.user_id,
      event_id: event.id,
    }),
    select: { last_seen_at: true },
  });

  if (!record) {
    return { is_following: false, has_update: false, last_seen_at: null };
  }
  return toFollowState(record.last_seen_at, event.last_activity_at);
}

/** 关注列表里有多少个事件在用户上次查看后又动过——侧栏角标用。 */
/**
 * 「有多少东西要看」——**事件与实体两个维度合成一个数字**。
 *
 * 用户关心的是有多少东西要看，不是「事件 3 条、实体 2 条」。
 * 两边各自去重后相加：实体那边已经按事件去过重（同一个事件挂着两个被关注的实体只算一次），
 * 但跨维度不再去重——一个事件既被直接关注、又因为实体被关注而出现，
 * 那确实是两条不同的理由要看它。
 */
export async function countFollowUpdates(params: {
  tenant_id: string;
  user_id: string;
}): Promise<number> {
  const [rows, entityUpdates] = await Promise.all([
    prisma.eventFollow.findMany({
      where: withTenantScope(params.tenant_id, { user_id: params.user_id }),
      select: { last_seen_at: true, event: { select: { last_activity_at: true } } },
    }),
    countEntityFollowUpdates(params),
  ]);

  const eventUpdates = rows.filter(
    (row) => row.event.last_activity_at.getTime() > row.last_seen_at.getTime(),
  ).length;

  return eventUpdates + entityUpdates;
}

/** slug 或 id 都能定位；顺便把事件不存在变成 404 而不是静默建一条悬空关注。 */
async function requireEvent(
  tenantId: string,
  eventId: string,
): Promise<{ id: string; last_activity_at: Date }> {
  const event = await prisma.newsEvent.findFirst({
    where: withTenantScope(tenantId, {
      OR: [{ id: eventId }, { slug: eventId }],
    }),
    select: { id: true, last_activity_at: true },
  });
  if (!event) {
    throw new NotFoundError("events.not_found");
  }
  return event;
}

function toFollowState(
  lastSeenAt: Date,
  lastActivityAt: Date,
): EventFollowState {
  return {
    is_following: true,
    has_update: lastActivityAt.getTime() > lastSeenAt.getTime(),
    last_seen_at: lastSeenAt.toISOString(),
  };
}
