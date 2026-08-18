/**
 * 关注实体。
 *
 * 与关注事件（`follow.service.ts`）是同一件事的两个维度，**共用 `events.follow` 权限**：
 * 为一个维度多开一个权限键，只会让管理员多勾一个框。
 *
 * 区别在时间尺度：事件 24h 后就凉，关注它第三天就没意义了；实体不会凉——
 * 关注「OpenAI」之后只要它再出现在任何事件里就有东西可推。这才是留存的支点。
 */
import {
  NotFoundError,
  prisma,
  withTenantScope,
} from "@rewindom/module-sdk/server";

import type { EventEntityFollowState } from "../../shared/index.js";

export interface EntityFollowParams {
  tenant_id: string;
  user_id: string;
  entity_id: string;
}

export interface EntityFollowScope {
  tenant_id: string;
  user_id: string;
}

/**
 * 关注。
 *
 * 刚关注时把 `last_seen_at` 设成当下——与关注事件同一条理由：
 * 不然用户一关注就立刻看到「有更新」，那条提示会立刻失去意义。
 */
export async function followEntity(
  params: EntityFollowParams,
): Promise<EventEntityFollowState> {
  const entity = await requireEntity(params.tenant_id, params.entity_id);
  const now = new Date();

  await prisma.eventEntityFollow.upsert({
    where: {
      tenant_id_user_id_entity_id: {
        tenant_id: params.tenant_id,
        user_id: params.user_id,
        entity_id: entity.id,
      },
    },
    create: {
      tenant_id: params.tenant_id,
      user_id: params.user_id,
      entity_id: entity.id,
      last_seen_at: now,
    },
    // 已关注时重复调用是幂等的，不要把 last_seen_at 往前推掉未读的新事件
    update: {},
  });

  return getEntityFollowState(params);
}

export async function unfollowEntity(params: EntityFollowParams): Promise<void> {
  const entity = await requireEntity(params.tenant_id, params.entity_id);
  await prisma.eventEntityFollow.deleteMany({
    where: withTenantScope(params.tenant_id, {
      user_id: params.user_id,
      entity_id: entity.id,
    }),
  });
}

export async function getEntityFollowState(
  params: EntityFollowParams,
): Promise<EventEntityFollowState> {
  const entity = await requireEntity(params.tenant_id, params.entity_id);
  const follow = await prisma.eventEntityFollow.findFirst({
    where: withTenantScope(params.tenant_id, {
      user_id: params.user_id,
      entity_id: entity.id,
    }),
    select: { last_seen_at: true },
  });

  if (!follow) {
    return { is_following: false, new_event_count: 0, last_seen_at: null };
  }

  return {
    is_following: true,
    new_event_count: await countNewEventsSince(
      params.tenant_id,
      entity.id,
      follow.last_seen_at,
    ),
    last_seen_at: follow.last_seen_at.toISOString(),
  };
}

/** 标记「看到这里」。与事件那条同口径，**刻意不记审计**——那是阅读进度。 */
export async function markEntitySeen(params: EntityFollowParams): Promise<void> {
  await prisma.eventEntityFollow.updateMany({
    where: withTenantScope(params.tenant_id, {
      user_id: params.user_id,
      entity_id: params.entity_id,
    }),
    data: { last_seen_at: new Date() },
  });
}

/**
 * 该用户关注的所有实体一共有多少个新事件。
 *
 * 与关注事件那条计数合并成一个数字给用户看——他关心的是「有多少东西要看」，
 * 不是「事件 3 条、实体 2 条」。
 */
export async function countEntityFollowUpdates(
  scope: EntityFollowScope,
): Promise<number> {
  const follows = await prisma.eventEntityFollow.findMany({
    where: withTenantScope(scope.tenant_id, { user_id: scope.user_id }),
    select: { entity_id: true, last_seen_at: true },
  });
  if (follows.length === 0) {
    return 0;
  }

  /*
   * 按事件去重：一个事件同时挂着两个被关注的实体时只算一次。
   * 用户看到的是「有几件新事」，不是「有几条关联」。
   */
  const seen = new Set<string>();
  for (const follow of follows) {
    const links = await prisma.eventEntityLink.findMany({
      where: withTenantScope(scope.tenant_id, {
        entity_id: follow.entity_id,
        created_at: { gt: follow.last_seen_at },
      }),
      select: { event_id: true },
    });
    for (const link of links) {
      seen.add(link.event_id);
    }
  }
  return seen.size;
}

/**
 * 「新事件」按 `EventEntityLink.created_at` 判，**不按事件的 `last_activity_at`**。
 *
 * 后者会让一个早就关注过、早就读过的老事件，因为来了条新信号又冒出来算「新」——
 * 那不是「这个实体有了新动静」，是「一件旧事又抖了一下」。
 */
async function countNewEventsSince(
  tenantId: string,
  entityId: string,
  since: Date,
): Promise<number> {
  return prisma.eventEntityLink.count({
    where: withTenantScope(tenantId, {
      entity_id: entityId,
      created_at: { gt: since },
    }),
  });
}

async function requireEntity(
  tenantId: string,
  entityId: string,
): Promise<{ id: string }> {
  const entity = await prisma.eventEntity.findFirst({
    where: withTenantScope(tenantId, {
      OR: [{ id: entityId }, { slug: entityId }],
    }),
    select: { id: true },
  });
  if (!entity) {
    throw new NotFoundError("events.entity_not_found");
  }
  return entity;
}
