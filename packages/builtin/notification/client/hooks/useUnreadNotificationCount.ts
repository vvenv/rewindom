import { api } from "@be-water/client-kit";
import { useQuery } from "@tanstack/react-query";

import { type NotificationUnreadCount } from "../../shared/index.js";


import { NOTIFICATION_UNREAD_KEY } from "./useNotifications.js";

export function useUnreadNotificationCount(enabled = true) {
  return useQuery({
    queryKey: NOTIFICATION_UNREAD_KEY,
    queryFn: () =>
      api.get<NotificationUnreadCount>("/notifications/unread-count"),
    enabled,
    refetchInterval: 30_000,
  });
}
