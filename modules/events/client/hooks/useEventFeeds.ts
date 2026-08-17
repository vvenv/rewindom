import { api } from "@rewindom/module-sdk/client";
import { useQuery } from "@tanstack/react-query";

import { EVENTS_QUERY_KEY } from "./useEvents.js";

import type { EventFeedListResult } from "../../shared/index.js";

export const EVENT_FEEDS_QUERY_KEY = [...EVENTS_QUERY_KEY, "feeds"] as const;

export function useEventFeeds() {
  return useQuery({
    queryKey: EVENT_FEEDS_QUERY_KEY,
    queryFn: () => api.get<EventFeedListResult>("/events/feeds"),
  });
}
