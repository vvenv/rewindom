import { api } from "@be-water/client-kit";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type NotificationItem } from "../../shared/index.js";


import { NOTIFICATIONS_KEY, NOTIFICATION_UNREAD_KEY } from "./useNotifications.js";

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) =>
      api.patch<NotificationItem>(`/notifications/${notificationId}/read`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      qc.invalidateQueries({ queryKey: NOTIFICATION_UNREAD_KEY });
    },
  });
}
