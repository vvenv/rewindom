import {
  AppError,
  defineRoute,
  isAppLocale,
  parsePagination,
  parseSortDir,
  resolveRequestLocale,
  sendCodedError,
} from "@rewindom/module-sdk/server";

import {
  getEventDetail,
  getEventFeed,
  listEvents,
  listTopicCounts,
} from "./event/event.service.js";

import {
  isEventStatus,
  isEventTopic,
  type EventStatus,
  type EventTopic,
} from "../shared/index.js";

import type { AppLocale } from "@rewindom/module-sdk";
import type { FastifyInstance, FastifyRequest } from "fastify";

/**
 * 事件读取面。全部只读——事件语料由采集任务写入，任何用户请求都不该改动它。
 * 唯一的写入面是关注（follow.routes.ts），落在租户态的 EventFollow 上。
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
    handler: async () => ({ items: await listTopicCounts() }),
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
}

/**
 * 事件语料是全平台共享的，但「谁关注了什么」是租户态的——
 * 每个读接口都要带上 viewer，列表才能标出 is_following / has_update。
 */
function viewerScope(request: FastifyRequest): {
  tenant_id: string;
  user_id: string;
  locale: AppLocale;
} {
  return {
    tenant_id: request.tenantContext!.tenant_id,
    user_id: request.authUser!.userId,
    locale: resolveEventsLocale(request),
  };
}

/**
 * 取文案语言：显式 `?locale=` 优先于 Accept-Language。
 *
 * 与 shop 的 `resolveCatalogLocale` 同一手法——主题编辑器预览一张 en 页面时，
 * 后台界面还是中文，取数却必须按**页面语言**，否则预览与实站会显示两份文案。
 */
export function resolveEventsLocale(request: FastifyRequest): AppLocale {
  const raw = (request.query as { locale?: unknown } | null | undefined)?.locale;
  return isAppLocale(raw) ? raw : resolveRequestLocale(request);
}

function parseTopic(value?: string): EventTopic | undefined {
  return isEventTopic(value) ? value : undefined;
}

function parseStatus(value?: string): EventStatus | undefined {
  return isEventStatus(value) ? value : undefined;
}
