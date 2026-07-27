import { api } from "@be-water/client-kit";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  NOTIFICATIONS_KEY,
  NOTIFICATION_UNREAD_KEY,
} from "./useNotifications.js";

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<{ updated_count: number }>("/notifications/read-all", {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      qc.invalidateQueries({ queryKey: NOTIFICATION_UNREAD_KEY });
    },
  });
}
