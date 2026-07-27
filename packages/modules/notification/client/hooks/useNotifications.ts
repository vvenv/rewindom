import { api } from "@be-water/client-kit";
import { useQuery } from "@tanstack/react-query";

import { type NotificationsPage } from "../../shared/index.js";



export const NOTIFICATIONS_KEY = ["notifications"] as const;
export const NOTIFICATION_UNREAD_KEY = [
  "notifications",
  "unread-count",
] as const;

export function useNotifications(
  page = 1,
  pageSize = 20,
  unreadOnly = false,
  enabled = true,
) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, page, pageSize, unreadOnly],
    queryFn: () =>
      api.get<NotificationsPage>("/notifications", {
        page,
        page_size: pageSize,
        unread_only: unreadOnly ? "true" : undefined,
      }),
    enabled,
  });
}
