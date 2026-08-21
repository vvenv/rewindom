import {
  AppError,
  defineRoute,
  emitAuditLogFromRequestSafe,
  sendCodedError,
} from "@rewindom/module-sdk/server";

import {
  createEventFeed,
  deleteEventFeed,
  listEventFeeds,
  updateEventFeed,
} from "./feed.service.js";

import type { EventFeedWriteBody } from "../../shared/index.js";
import type { FastifyInstance, FastifyReply } from "fastify";

export async function feedRoutes(app: FastifyInstance): Promise<void> {
  defineRoute(app, {
    method: "GET",
    url: "/",
    context: "EventFeedList",
    errorCode: "EVENT_FEED_LIST_FAILED",
    preHandler: [app.requirePermission("events.read")],
    handler: async (request) =>
      listEventFeeds(
        request.tenantContext!.tenant_id,
        request.tenantContext!.tenant_slug,
      ),
  });

  defineRoute(app, {
    method: "POST",
    url: "/",
    context: "EventFeedCreate",
    errorCode: "EVENT_FEED_CREATE_FAILED",
    preHandler: [app.requirePermission("events.write")],
    handler: async (request, reply) =>
      guardAppError(reply, async () => {
        const feed = await createEventFeed(
          request.tenantContext!.tenant_id,
          request.tenantContext!.tenant_slug,
          request.body as EventFeedWriteBody,
        );
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "EVENT_FEED_CREATE",
          resource: feed.id,
          detail_key: "events.audit.feed_created",
          detail_params: { name: feed.name },
        });
        return feed;
      }),
  });

  defineRoute(app, {
    method: "PATCH",
    url: "/:feedId",
    context: "EventFeedUpdate",
    errorCode: "EVENT_FEED_UPDATE_FAILED",
    preHandler: [app.requirePermission("events.write")],
    handler: async (request, reply) =>
      guardAppError(reply, async () => {
        const { feedId } = request.params as { feedId: string };
        const feed = await updateEventFeed({
          tenant_id: request.tenantContext!.tenant_id,
          tenant_slug: request.tenantContext!.tenant_slug,
          feed_id: feedId,
          body: request.body as EventFeedWriteBody,
        });
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "EVENT_FEED_UPDATE",
          resource: feed.id,
          detail_key: "events.audit.feed_updated",
          detail_params: { name: feed.name },
        });
        return feed;
      }),
  });

  defineRoute(app, {
    method: "DELETE",
    url: "/:feedId",
    context: "EventFeedDelete",
    errorCode: "EVENT_FEED_DELETE_FAILED",
    preHandler: [app.requirePermission("events.write")],
    handler: async (request, reply) =>
      guardAppError(reply, async () => {
        const { feedId } = request.params as { feedId: string };
        await deleteEventFeed(request.tenantContext!.tenant_id, feedId);
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "EVENT_FEED_DELETE",
          resource: feedId,
          detail_key: "events.audit.feed_deleted",
          detail_params: { name: feedId },
        });
        return { deleted: true };
      }),
  });
}

async function guardAppError<T>(
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
