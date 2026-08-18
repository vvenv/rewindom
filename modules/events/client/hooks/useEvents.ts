import { api } from "@rewindom/module-sdk/client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type {
  EventDetail,
  EventFeedResult,
  EventListResult,
  EventStatus,
  EventTopic,
  EventTopicCount,
} from "../../shared/index.js";

export const EVENTS_QUERY_KEY = ["events"] as const;

export interface EventsQueryParams {
  page?: number;
  pageSize?: number;
  q?: string;
  topic?: EventTopic;
  status?: EventStatus;
  followingOnly?: boolean;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export function useEvents(params: EventsQueryParams, enabled = true) {
  return useQuery({
    enabled,
    placeholderData: keepPreviousData,
    queryKey: [...EVENTS_QUERY_KEY, "list", params],
    queryFn: () => {
      const query: Record<string, number | string> = {};
      if (params.page !== undefined) query.page = params.page;
      if (params.pageSize !== undefined) query.page_size = params.pageSize;
      if (params.q) query.q = params.q;
      if (params.topic) query.topic = params.topic;
      if (params.status) query.status = params.status;
      if (params.followingOnly) query.following = "true";
      if (params.sortBy) query.sort_by = params.sortBy;
      if (params.sortDir) query.sort_dir = params.sortDir;
      return api.get<EventListResult>("/events", query);
    },
  });
}

/** 首页两个区块一次取回，避免首屏两段各自 loading。 */
export function useEventFeed(topic?: EventTopic, enabled = true) {
  return useQuery({
    enabled,
    placeholderData: keepPreviousData,
    queryKey: [...EVENTS_QUERY_KEY, "feed", topic ?? null],
    queryFn: () =>
      api.get<EventFeedResult>("/events/feed", topic ? { topic } : {}),
  });
}

export function useEventTopics() {
  return useQuery({
    queryKey: [...EVENTS_QUERY_KEY, "topics"],
    queryFn: () =>
      api.get<{ items: EventTopicCount[]; enabled_topics: EventTopic[] }>(
        "/events/topics",
      ),
  });
}

export function useEventDetail(eventId: string | undefined) {
  return useQuery({
    enabled: Boolean(eventId),
    queryKey: [...EVENTS_QUERY_KEY, "detail", eventId],
    queryFn: () => api.get<EventDetail>(`/events/${eventId!}`),
  });
}

/** 关注列表里有多少个事件有新进展——工作台卡片与导航角标用。 */
export function useEventFollowUpdates() {
  return useQuery({
    queryKey: [...EVENTS_QUERY_KEY, "follow-updates"],
    queryFn: () => api.get<{ count: number }>("/events/follows/updates"),
  });
}
