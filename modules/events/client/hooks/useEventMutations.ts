import { api } from "@rewindom/module-sdk/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { EVENTS_QUERY_KEY } from "./useEvents.js";

import type {
  EventDetail,
  EventSignalRemoveResult,
  EventUpdateBody,
} from "../../shared/index.js";

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

/**
 * 移除事件下的一条信号（软删）。
 *
 * 移掉最后一条时事件本身也没了——调用方要看 `event_deleted` 决定是留在详情页
 * 还是跳回列表，否则会停在一个刚被删掉的详情上反复 404。
 */
export function useRemoveEventSignal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      signalId,
    }: {
      eventId: string;
      signalId: string;
    }) =>
      api.delete<EventSignalRemoveResult>(
        `/events/${eventId}/signals/${signalId}`,
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEY });
    },
  });
}
