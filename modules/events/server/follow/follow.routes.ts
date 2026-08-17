import {
  AppError,
  defineRoute,
  emitAuditLogFromRequestSafe,
  sendCodedError,
} from "@rewindom/module-sdk/server";

import {
  countFollowUpdates,
  followEvent,
  getFollowState,
  markEventSeen,
  unfollowEvent,
} from "./follow.service.js";

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

/**
 * 关注面——模块里唯一写租户态数据的地方。
 *
 * MVP §8：Follow 是把「每天打开一次的榜单」变成「持续追踪工具」的机制，
 * 所以它是一等公民而非收藏夹的附属功能。
 */
export async function followRoutes(app: FastifyInstance): Promise<void> {
  defineRoute(app, {
    method: "GET",
    url: "/updates",
    context: "EventFollowUpdates",
    errorCode: "EVENT_FOLLOW_UPDATES_FAILED",
    preHandler: [app.requirePermission("events.read")],
    handler: async (request) => ({
      count: await countFollowUpdates(scopeOf(request)),
    }),
  });

  defineRoute(app, {
    method: "GET",
    url: "/:eventId",
    context: "EventFollowState",
    errorCode: "EVENT_FOLLOW_STATE_FAILED",
    preHandler: [app.requirePermission("events.read")],
    handler: async (request, reply) =>
      guardNotFound(reply, () =>
        getFollowState({ ...scopeOf(request), event_id: eventIdOf(request) }),
      ),
  });

  defineRoute(app, {
    method: "POST",
    url: "/:eventId",
    context: "EventFollow",
    errorCode: "EVENT_FOLLOW_FAILED",
    preHandler: [app.requirePermission("events.follow")],
    handler: async (request, reply) =>
      guardNotFound(reply, async () => {
        const event_id = eventIdOf(request);
        const state = await followEvent({ ...scopeOf(request), event_id });

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "EVENT_FOLLOW",
          resource: event_id,
          detail_key: "events.audit.followed",
          detail_params: { event: event_id },
        });

        return state;
      }),
  });

  defineRoute(app, {
    method: "DELETE",
    url: "/:eventId",
    context: "EventUnfollow",
    errorCode: "EVENT_UNFOLLOW_FAILED",
    preHandler: [app.requirePermission("events.follow")],
    handler: async (request, reply) =>
      guardNotFound(reply, async () => {
        const event_id = eventIdOf(request);
        await unfollowEvent({ ...scopeOf(request), event_id });

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "EVENT_UNFOLLOW",
          resource: event_id,
          detail_key: "events.audit.unfollowed",
          detail_params: { event: event_id },
        });

        return { is_following: false, has_update: false, last_seen_at: null };
      }),
  });

  /**
   * 「看到这里了」。刻意不记审计——这是用户自己的阅读进度，
   * 不是需要向管理员交代的操作（同 notification 的 read 回执）。
   */
  defineRoute(app, {
    method: "POST",
    url: "/:eventId/seen",
    context: "EventMarkSeen",
    errorCode: "EVENT_MARK_SEEN_FAILED",
    preHandler: [app.requirePermission("events.follow")],
    handler: async (request, reply) =>
      guardNotFound(reply, () =>
        markEventSeen({ ...scopeOf(request), event_id: eventIdOf(request) }),
      ),
  });
}

function scopeOf(request: FastifyRequest): {
  tenant_id: string;
  user_id: string;
} {
  return {
    tenant_id: request.tenantContext!.tenant_id,
    user_id: request.authUser!.userId,
  };
}

function eventIdOf(request: FastifyRequest): string {
  return (request.params as { eventId: string }).eventId;
}

/** 事件不存在时回 404 的编码错误；其余异常交给全局 error-handler。 */
async function guardNotFound<T>(
  reply: FastifyReply,
  run: () => Promise<T>,
): Promise<T | void> {
  try {
    return await run();
  } catch (err) {
    if (err instanceof AppError && err.code) {
      sendCodedError(reply, err.status, err.code, err.params);
      return;
    }
    throw err;
  }
}
