import { useEffect, useRef } from "react";

import { useParams } from "react-router";

import { useEventDetail } from "./useEvents.js";
import { useMarkEventSeen } from "./useFollowMutations.js";

/**
 * 详情页编排：读详情，并在打开时把关注记录的「看到这里」推到当前。
 *
 * 用 ref 记住已标记过的事件——标记会失效查询并触发重新拉取，
 * 不挡住第二次就会变成「拉取 → 标记 → 拉取」的死循环。
 */
export function useEventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const query = useEventDetail(eventId);
  const { mutate: markSeen } = useMarkEventSeen();
  const markedEventId = useRef<string | null>(null);
  const isFollowing = query.data?.is_following ?? false;

  useEffect(() => {
    if (!eventId || !isFollowing || markedEventId.current === eventId) {
      return;
    }
    markedEventId.current = eventId;
    markSeen(eventId);
  }, [eventId, isFollowing, markSeen]);

  return { eventId, ...query };
}
