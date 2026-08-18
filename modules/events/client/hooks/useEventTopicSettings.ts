import { api } from "@rewindom/module-sdk/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { EVENTS_QUERY_KEY } from "./useEvents.js";

import type { EventTopicSettings } from "../../shared/index.js";

export const EVENT_SETTINGS_QUERY_KEY = [...EVENTS_QUERY_KEY, "settings"] as const;

export function useEventTopicSettings() {
  return useQuery({
    queryKey: EVENT_SETTINGS_QUERY_KEY,
    queryFn: () => api.get<EventTopicSettings>("/events/settings"),
  });
}

export function useUpdateEventTopicSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: EventTopicSettings) =>
      api.put<EventTopicSettings>("/events/settings", body),
    onSuccess: (data) => {
      queryClient.setQueryData(EVENT_SETTINGS_QUERY_KEY, data);
      void queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEY });
    },
  });
}
