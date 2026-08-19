import { Badge } from "@rewindom/ui/badge";
import { Card, CardContent, CardHeader } from "@rewindom/ui/card";
import { Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { formatSourceNames } from "../lib/events.js";

import { EventStatusBadge } from "./EventStatusBadge.js";
import { EventMomentumBadge } from "./EventMomentumBadge.js";
import { EventFactChips } from "./EventFactChips.js";
import { RelativeTime } from "./RelativeTime.js";

import type { EventListItem } from "../../shared/index.js";

/**
 * 事件卡片。刻意只有五样东西：标题、一句话、阶段、增速、来源 —— MVP §2 的
 * 「3~5 分钟理解今天最重要的几件事」要求一屏能扫完，多一个字段就少一张卡片。
 */
export function EventCard({ event }: { event: EventListItem }) {
  const { t } = useTranslation("events");

  return (
    <Card className="transition-colors hover:border-primary/40">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <EventStatusBadge status={event.status} />
          <Badge variant="secondary">{t(`topic.${event.topic}`)}</Badge>
          <EventFactChips event={event} />
          <EventMomentumBadge event={event} />
          {event.has_update ? (
            <Badge className="gap-1">
              <Bell className="size-3" />
              {t("card.hasUpdate")}
            </Badge>
          ) : null}
        </div>
        <Link
          to={`/app/events/${event.id}`}
          className="text-base leading-snug font-semibold hover:underline"
        >
          {event.title}
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {event.headline ? (
          <p className="text-muted-foreground line-clamp-2 text-sm">
            {event.headline}
          </p>
        ) : null}
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {event.source_names.length > 0 ? (
            <span>
              {t("card.sources", {
                names: formatSourceNames(event.source_names),
              })}
            </span>
          ) : null}
          <span>{t("card.signals", { count: event.signal_count })}</span>
          <RelativeTime iso={event.last_activity_at} />
        </div>
      </CardContent>
    </Card>
  );
}
