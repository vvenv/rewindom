import { NotificationShellSlots } from "./shell/notification-shell-slots.js";

import type { ClientAppModule } from "@be-water/client-kit";

export const notificationClientModule: ClientAppModule = {
  id: "notification",
  version: "1.0.0",
  label: "Notification",
  kind: "infrastructure",
  description: "通知与活动中心",
  client: {
    shell: {
      shellProviders: [NotificationShellSlots],
    },
  },
};
