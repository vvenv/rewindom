import { ApiError, usePermissions } from "@rewindom/module-sdk/client";
import { Button } from "@rewindom/ui/button";
import { toast } from "@rewindom/ui/toast";
import { Bell, BellOff } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useFollowEvent, useUnfollowEvent } from "../hooks/useFollowMutations.js";

/**
 * 关注按钮。MVP §8 把它当成留存机制的核心，所以放在详情页最显眼的动作位，
 * 而不是折进「更多」菜单。无权限时不渲染禁用按钮。
 */
export function FollowEventButton({
  eventId,
  isFollowing,
}: {
  eventId: string;
  isFollowing: boolean;
}) {
  const { t } = useTranslation("events");
  const { hasPermission } = usePermissions();
  const followMutation = useFollowEvent();
  const unfollowMutation = useUnfollowEvent();

  if (!hasPermission("events.follow")) {
    return null;
  }

  const isPending = followMutation.isPending || unfollowMutation.isPending;

  const handleClick = async (): Promise<void> => {
    try {
      if (isFollowing) {
        await unfollowMutation.mutateAsync(eventId);
        toast.success(t("follow.unfollowed"));
      } else {
        await followMutation.mutateAsync(eventId);
        toast.success(t("follow.followed"));
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("follow.failed"));
    }
  };

  return (
    <Button
      variant={isFollowing ? "outline" : "default"}
      disabled={isPending}
      onClick={() => void handleClick()}
    >
      {isFollowing ? (
        <BellOff className="size-4" />
      ) : (
        <Bell className="size-4" />
      )}
      {isFollowing ? t("follow.unfollow") : t("follow.follow")}
    </Button>
  );
}
