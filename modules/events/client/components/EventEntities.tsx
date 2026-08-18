import { Badge } from "@rewindom/ui/badge";
import { Button } from "@rewindom/ui/button";
import { Check, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useFollowEntity, useUnfollowEntity } from "../hooks/useFollowMutations.js";

import type { EventEntityItem } from "../../shared/index.js";

/**
 * 事件涉及的实体，每个都能直接关注。
 *
 * 关注实体是留存的支点：事件 24h 后就凉，关注它第三天就没意义了；
 * 实体不会凉——关注「OpenAI」之后只要它再出现在任何事件里就有东西可推。
 * 所以关注入口就放在读到这个实体的地方，不要求用户先跳去实体页。
 *
 * 抽不到实体就整块不渲染，与势头角标、修订区块同一条口径：留白，不写「暂无」。
 */
export function EventEntities({
  entities,
  canFollow,
}: {
  entities: EventEntityItem[];
  canFollow: boolean;
}) {
  const { t } = useTranslation("events");
  const follow = useFollowEntity();
  const unfollow = useUnfollowEntity();

  if (entities.length === 0) {
    return null;
  }

  const pending = follow.isPending || unfollow.isPending;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground text-xs">{t("entities.title")}</span>
      {entities.map((entity) =>
        canFollow ? (
          <Button
            key={entity.id}
            size="sm"
            variant={entity.is_following ? "secondary" : "outline"}
            className="h-7 gap-1 px-2 text-xs font-normal"
            disabled={pending}
            aria-pressed={entity.is_following}
            title={
              entity.is_following
                ? t("entities.unfollow", { name: entity.name })
                : t("entities.follow", { name: entity.name })
            }
            onClick={() =>
              entity.is_following
                ? unfollow.mutate(entity.id)
                : follow.mutate(entity.id)
            }
          >
            {entity.is_following ? (
              <Check className="size-3" />
            ) : (
              <Plus className="size-3" />
            )}
            {entity.name}
          </Button>
        ) : (
          <Badge key={entity.id} variant="outline" className="font-normal">
            {entity.name}
          </Badge>
        ),
      )}
    </div>
  );
}
