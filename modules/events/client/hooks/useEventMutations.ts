import { api } from "@rewindom/module-sdk/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { EVENTS_QUERY_KEY } from "./useEvents.js";

import type { EventDetail, EventUpdateBody } from "../../shared/index.js";

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      ...body
    }: EventUpdateBody & { eventId: string }) =>
      api.patch<EventDetail>(`/events/${eventId}`, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEY });
    },
  });
}
