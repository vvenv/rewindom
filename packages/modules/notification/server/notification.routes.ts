
import { defineRoute } from "@be-water/server-kernel/http/define-route.js";
import { parsePagination } from "@be-water/server-kernel/http/pagination.js";
import { error } from "@be-water/shared";

import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "./notification.service.js";

import type { FastifyInstance } from "fastify";

interface NotificationIdParams {
  notificationId: string;
}

export async function notificationRoutes(app: FastifyInstance) {
  defineRoute(app, {
    method: "GET",
    url: "/",
    onRequest: [app.authenticate],
    context: "[notificationRoutes] 获取通知列表失败",
    errorCode: "LIST_NOTIFICATIONS_FAILED",
    handler: async (request) => {
      const { unread_only } = request.query as Record<string, string>;
      const { page, page_size } = parsePagination(
        request.query as Record<string, unknown>,
      );

      return listNotifications(
        app.prisma,
        request.tenantContext!.tenant_id,
        request.authUser!.userId,
        {
          page,
          page_size,
          unread_only: unread_only === "true",
        },
      );
    },
  });

  defineRoute(app, {
    method: "GET",
    url: "/unread-count",
    onRequest: [app.authenticate],
    context: "[notificationRoutes] 获取未读数量失败",
    errorCode: "GET_NOTIFICATION_UNREAD_COUNT_FAILED",
    handler: async (request) => {
      return getUnreadCount(
        app.prisma,
        request.tenantContext!.tenant_id,
        request.authUser!.userId,
      );
    },
  });

  defineRoute(app, {
    method: "PATCH",
    url: "/:notificationId/read",
    onRequest: [app.authenticate],
    context: "[notificationRoutes] 标记通知已读失败",
    errorCode: "MARK_NOTIFICATION_READ_FAILED",
    handler: async (request, reply) => {
      const { notificationId } = request.params as NotificationIdParams;
      const item = await markNotificationRead(
        app.prisma,
        request.tenantContext!.tenant_id,
        request.authUser!.userId,
        notificationId,
      );
      if (!item) {
        return reply
          .code(404)
          .send(error("通知不存在", "NOTIFICATION_NOT_FOUND"));
      }
      return item;
    },
  });

  defineRoute(app, {
    method: "POST",
    url: "/read-all",
    onRequest: [app.authenticate],
    context: "[notificationRoutes] 全部标记已读失败",
    errorCode: "MARK_ALL_NOTIFICATIONS_READ_FAILED",
    handler: async (request) => {
      return markAllNotificationsRead(
        app.prisma,
        request.tenantContext!.tenant_id,
        request.authUser!.userId,
      );
    },
  });
}
