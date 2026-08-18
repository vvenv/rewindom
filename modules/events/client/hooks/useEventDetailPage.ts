import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError, useConfirm } from "@rewindom/module-sdk/client";
import { toast } from "@rewindom/ui/toast";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";

import { useRemoveEventSignal } from "./useEventMutations.js";
import { useEventDetail } from "./useEvents.js";
import { useMarkEventSeen } from "./useFollowMutations.js";

import type { EventSourceItem } from "../../shared/index.js";

/**
 * 详情页编排：读详情，并在打开时把关注记录的「看到这里」推到当前。
 *
 * 用 ref 记住已标记过的事件——标记会失效查询并触发重新拉取，
 * 不挡住第二次就会变成「拉取 → 标记 → 拉取」的死循环。
 */
export function useEventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { t } = useTranslation("events");
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const query = useEventDetail(eventId);
  const { mutate: markSeen } = useMarkEventSeen();
  const removeSignal = useRemoveEventSignal();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const markedEventId = useRef<string | null>(null);
  const isFollowing = query.data?.is_following ?? false;

  useEffect(() => {
    if (!eventId || !isFollowing || markedEventId.current === eventId) {
      return;
    }
    markedEventId.current = eventId;
    markSeen(eventId);
  }, [eventId, isFollowing, markSeen]);

  /**
   * 移除一条来源信号。
   *
   * 二次确认里点名这是**软删**：源下一轮还会发同一篇，我们靠留下的墓碑挡住重建，
   * 所以这个动作是一次性的、也是不可撤销的（界面上没有恢复入口）。
   * 移掉最后一条时事件本身没了，得跳回列表，否则停在一个已删详情上反复 404。
   */
  const handleRemoveSignal = useCallback(
    async (source: EventSourceItem) => {
      if (!eventId) {
        return;
      }
      const confirmed = await confirm({
        title: t("detail.removeSignalConfirmTitle"),
        description: t("detail.removeSignalConfirmDescription", {
          title: source.title,
        }),
        destructive: true,
      });
      if (!confirmed) {
        return;
      }
      setRemovingId(source.id);
      try {
        const result = await removeSignal.mutateAsync({
          eventId,
          signalId: source.id,
        });
        if (result.event_deleted) {
          toast.success(t("detail.removeSignalToastEventGone"));
          void navigate("/app/events");
          return;
        }
        toast.success(t("detail.removeSignalToast"));
      } catch (err) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : t("detail.removeSignalFailed"),
        );
      } finally {
        setRemovingId(null);
      }
    },
    [confirm, eventId, navigate, removeSignal, t],
  );

  return { eventId, ...query, handleRemoveSignal, removingId };
}
