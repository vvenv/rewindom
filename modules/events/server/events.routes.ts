import {
  AppError,
  defineRoute,
  emitAuditLogFromRequestSafe,
  parsePagination,
  parseSortDir,
  sendCodedError,
} from "@rewindom/module-sdk/server";

import {
  getEventDetail,
  getEventFeed,
  listEvents,
  listTopicCounts,
  updateEvent,
} from "./event/event.service.js";

import {
  isEventStatus,
  isEventTopic,
  type EventStatus,
  type EventTopic,
} from "../shared/index.js";

import type { FastifyInstance, FastifyRequest } from "fastify";

/**
 * 事件读取面 + 工作台编辑。
 *
 * 语料由采集任务写入，工作台可以改标题 / 摘要 / 主题（events.write）。
 * 采集源 CRUD 在 feed.routes.ts。关注落在 follow.routes.ts。
 */
export async function eventsRoutes(app: FastifyInstance): Promise<void> {
  defineRoute(app, {
    method: "GET",
    url: "/",
    context: "EventList",
    errorCode: "EVENT_LIST_FAILED",
    preHandler: [app.requirePermission("events.read")],
    handler: async (request) => {
      const query = request.query as {
        q?: string;
        topic?: string;
        status?: string;
        following?: string;
        sort_by?: string;
        sort_dir?: string;
      };
      const { page, page_size } = parsePagination(
        request.query as Record<string, unknown>,
      );

      return listEvents({
        ...viewerScope(request),
        page,
        page_size,
        q: query.q,
        topic: parseTopic(query.topic),
        status: parseStatus(query.status),
        following_only: query.following === "true",
        sort_by: query.sort_by,
        sort_dir: parseSortDir(query.sort_dir),
      });
    },
  });

  // 首页三个区块一次取回，避免首屏三段各自 loading（见 event.service 的说明）
  defineRoute(app, {
    method: "GET",
    url: "/feed",
    context: "EventFeed",
    errorCode: "EVENT_FEED_FAILED",
    preHandler: [app.requirePermission("events.read")],
    handler: async (request) => {
      const { topic } = request.query as { topic?: string };
      return getEventFeed({ ...viewerScope(request), topic: parseTopic(topic) });
    },
  });

  defineRoute(app, {
    method: "GET",
    url: "/topics",
    context: "EventTopicList",
    errorCode: "EVENT_TOPIC_LIST_FAILED",
    preHandler: [app.requirePermission("events.read")],
    handler: async (request) => ({
      items: await listTopicCounts(request.tenantContext!.tenant_id),
    }),
  });

  defineRoute(app, {
    method: "GET",
    url: "/:eventId",
    context: "EventDetail",
    errorCode: "EVENT_DETAIL_FAILED",
    preHandler: [app.requirePermission("events.read")],
    handler: async (request, reply) => {
      try {
        const { eventId } = request.params as { eventId: string };
        return await getEventDetail({
          ...viewerScope(request),
          event_id: eventId,
        });
      } catch (err) {
        if (err instanceof AppError && err.code) {
          return sendCodedError(reply, err.status, err.code, err.params);
        }
        throw err;
      }
    },
  });

  defineRoute(app, {
    method: "PATCH",
    url: "/:eventId",
    context: "EventUpdate",
    errorCode: "EVENT_UPDATE_FAILED",
    preHandler: [app.requirePermission("events.write")],
    handler: async (request, reply) => {
      try {
        const { eventId } = request.params as { eventId: string };
        const body = request.body as {
          title?: string;
          summary?: string;
          topic?: string;
        };
        const event = await updateEvent({
          ...viewerScope(request),
          event_id: eventId,
          title: body.title,
          summary: body.summary,
          topic: parseTopic(body.topic),
        });

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: "EVENT_UPDATE",
          resource: event.id,
          detail_key: "events.audit.updated",
          detail_params: { event: event.title },
        });

        return event;
      } catch (err) {
        if (err instanceof AppError && err.code) {
          return sendCodedError(reply, err.status, err.code, err.params);
        }
        throw err;
      }
    },
  });
}

/**
 * 每个读接口都要带上 viewer，列表才能标出 is_following / has_update。
 * 语料按站点隔离，viewer.tenant_id 同时是查询谓词。
 */
function viewerScope(request: FastifyRequest): {
  tenant_id: string;
  user_id: string;
} {
  return {
    tenant_id: request.tenantContext!.tenant_id,
    user_id: request.authUser!.userId,
  };
}

function parseTopic(value?: string): EventTopic | undefined {
  return isEventTopic(value) ? value : undefined;
}

function parseStatus(value?: string): EventStatus | undefined {
  return isEventStatus(value) ? value : undefined;
}
