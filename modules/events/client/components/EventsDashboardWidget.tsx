import { DashboardWidgetCard } from "@rewindom/module-sdk/client";
import { Badge } from "@rewindom/ui/badge";
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
  const { data, isLoading, isError } = useEvents({
    page: 1,
    pageSize: WIDGET_SIZE,
    followingOnly: true,
    sortBy: "last_activity_at",
    sortDir: "desc",
  });

  const items = data?.items ?? [];
  const updates = items.filter((event) => event.has_update).length;

  return (
    <DashboardWidgetCard
      icon={Radar}
      title={t("dashboardTitle")}
      to="/app/events?following=true&view=all"
      viewAllLabel={t("widget.viewAll")}
      headerExtra={
        updates > 0 ? (
          <Badge className="w-fit gap-1">
            <Bell className="size-3" />
            {t("widget.updates", { count: updates })}
          </Badge>
        ) : null
      }
      isLoading={isLoading && !data}
      isError={isError}
      errorText={t("loadFailed")}
      isEmpty={items.length === 0}
      emptyText={
        <>
          {t("widget.empty")}
          <span className="mt-1 block">{t("widget.emptyHint")}</span>
        </>
      }
    >
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
    </DashboardWidgetCard>
  );
}
