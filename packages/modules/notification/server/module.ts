import { prisma } from "@be-water/server-kernel/lib/prisma.js";

import { notificationRoutes } from "./notification.routes.js";
import {
  createNotification,
  type CreateNotificationInput,
} from "./notification.service.js";

import type { NotificationCreateEventPayload } from "@be-water/server-kernel/runtime/domain-events.js";
import type { ServerAppModule } from "@be-water/server-kernel/runtime/module-contract.js";

function toCreateNotificationInput(
  payload: NotificationCreateEventPayload,
): CreateNotificationInput {
  return payload as CreateNotificationInput;
}

export const notificationServerModule: ServerAppModule = {
  id: "notification",
  version: "1.0.0",
  label: "Notification",
  kind: "infrastructure",
  description: "租户站内通知 API",
  requires: ["rbac"],
  server: {
    registerRoutes: async (app) => {
      await app.register(notificationRoutes, { prefix: "/api/notifications" });
    },
    onBoot: async (ctx) => {
      ctx.events.on("notification.create", async (payload) => {
        try {
          await createNotification(prisma, toCreateNotificationInput(payload));
        } catch (err) {
          ctx.log.warn({ err }, "[notification] event handler failed");
        }
      });
    },
  },
};
