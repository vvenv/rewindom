import { api } from "@rewindom/module-sdk/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { EVENTS_QUERY_KEY } from "./useEvents.js";

import type {
  EventEntityFollowState,
  EventFollowState,
} from "../../shared/index.js";

/**
 * 关注 / 取关 / 标记已读。
 *
 * 三者都会改动列表上的 is_following / has_update，因此统一失效整个 events 查询树——
 * 逐个精确失效在这里省不下多少请求，却很容易漏掉某个视图导致状态不一致。
 */
function useInvalidateEvents() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEY });
  };
}

export function useFollowEvent() {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: (eventId: string) =>
      api.post<EventFollowState>(`/events/follows/${eventId}`, {}),
    onSuccess: invalidate,
  });
}

export function useUnfollowEvent() {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: (eventId: string) =>
      api.delete<EventFollowState>(`/events/follows/${eventId}`),
    onSuccess: invalidate,
  });
}

/**
 * 打开详情时把「看到这里」推到当前时间。
 *
 * 未关注的事件调用它是空操作（服务端不会凭空建关注记录），
 * 所以页面无需先判断是否已关注。
 */
export function useMarkEventSeen() {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: (eventId: string) =>
      api.post<EventFollowState>(`/events/follows/${eventId}/seen`, {}),
    onSuccess: invalidate,
  });
}

/**
 * 关注 / 取关实体。
 *
 * 与关注事件走同一条失效策略：实体的关注态挂在事件详情的 `entities` 上，
 * 逐个精确失效省不下多少请求，却很容易漏掉某个视图导致状态不一致。
 */
export function useFollowEntity() {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: (entityId: string) =>
      api.post<EventEntityFollowState>(`/events/follows/entity/${entityId}`, {}),
    onSuccess: invalidate,
  });
}

export function useUnfollowEntity() {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: (entityId: string) =>
      api.delete<EventEntityFollowState>(`/events/follows/entity/${entityId}`),
    onSuccess: invalidate,
  });
}
