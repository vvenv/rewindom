import { api } from "@rewindom/module-sdk/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { EVENT_FEEDS_QUERY_KEY } from "./useEventFeeds.js";

import type {
  EventFeedItem,
  EventFeedWriteBody,
} from "../../shared/index.js";

function useInvalidateFeeds() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: EVENT_FEEDS_QUERY_KEY });
}

export function useCreateEventFeed() {
  const invalidate = useInvalidateFeeds();
  return useMutation({
    mutationFn: (body: EventFeedWriteBody) =>
      api.post<EventFeedItem>("/events/feeds", body),
    onSuccess: invalidate,
  });
}

export function useUpdateEventFeed() {
  const invalidate = useInvalidateFeeds();
  return useMutation({
    mutationFn: ({
      feedId,
      ...body
    }: EventFeedWriteBody & { feedId: string }) =>
      api.patch<EventFeedItem>(`/events/feeds/${feedId}`, body),
    onSuccess: invalidate,
  });
}

export function useDeleteEventFeed() {
  const invalidate = useInvalidateFeeds();
  return useMutation({
    mutationFn: (feedId: string) =>
      api.delete<{ deleted: boolean }>(`/events/feeds/${feedId}`),
    onSuccess: invalidate,
  });
}
