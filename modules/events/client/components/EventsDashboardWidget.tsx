import { EmptyState } from "@rewindom/module-sdk/client";
import { Badge } from "@rewindom/ui/badge";
import { Button } from "@rewindom/ui/button";
import { Skeleton } from "@rewindom/ui/skeleton";
import { Bell, Radar } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { useEvents } from "../hooks/useEvents.js";

import { RelativeTime } from "./RelativeTime.js";

const WIDGET_SIZE = 5;

/**
 * 工作台上的「关注的事件」。
 *
 * 这是 Follow 这条留存回路的另一半（MVP §8）：用户不必主动打开事件页，
 * 有新进展会在他每天都会看的工作台上先冒出来。
 */
export function EventsDashboardWidget() {
  const { t } = useTranslation("events");
  const { data, isLoading } = useEvents({
    page: 1,
    pageSize: WIDGET_SIZE,
    followingOnly: true,
    sortBy: "last_activity_at",
    sortDir: "desc",
  });

  if (isLoading && !data) {
    return (
      <div className="flex flex-col gap-2" aria-hidden>
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-9 w-full" />
        ))}
      </div>
    );
  }

  const items = data?.items ?? [];
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Radar}
        size="panel"
        title={t("widget.empty")}
        description={t("widget.emptyHint")}
      />
    );
  }

  const updates = items.filter((event) => event.has_update).length;

  return (
    <div className="flex flex-col gap-2">
      {updates > 0 ? (
        <Badge className="w-fit gap-1">
          <Bell className="size-3" />
          {t("widget.updates", { count: updates })}
        </Badge>
      ) : null}
      <ul className="flex flex-col">
        {items.map((event) => (
          <li key={event.id}>
            <Link
              to={`/app/events/${event.id}`}
              className="hover:bg-muted/60 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
            >
              <span className="flex-1 truncate">{event.title}</span>
              {event.has_update ? (
                <span className="bg-primary size-1.5 shrink-0 rounded-full" />
              ) : null}
              <span className="text-muted-foreground shrink-0 text-xs">
                <RelativeTime iso={event.last_activity_at} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link to="/app/events?following=true&view=all">
          {t("widget.viewAll")}
        </Link>
      </Button>
    </div>
  );
}
