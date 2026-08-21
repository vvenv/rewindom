import { Badge } from "@rewindom/ui/badge";
import { Card, CardContent, CardHeader } from "@rewindom/ui/card";
import { Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { EventMomentumBadge } from "./EventMomentumBadge.js";
import { EventFactChips } from "./EventFactChips.js";
import { RelativeTime } from "./RelativeTime.js";
import { SourceIcon } from "./SourceIcon.js";

import {
  describeCardEvidence,
  isThickEventCard,
  type EventListItem,
} from "../../shared/index.js";

/**
 * 事件卡片。厚卡才摊开证据（归位 / 已证实角标、事实 chips、势头）；
 * 薄卡只留标题与来源——对比本身就是过滤器。
 */
export function EventCard({ event }: { event: EventListItem }) {
  const { t } = useTranslation("events");
  const thick = isThickEventCard(event);
  const evidence = thick ? describeCardEvidence(event, t) : "";
  const showBadges = thick || event.has_update;

  return (
    <Card className="transition-colors hover:border-primary/40">
      <CardHeader className="gap-2">
        {showBadges ? (
          <div className="flex flex-wrap items-center gap-2">
            {evidence ? (
              <Badge variant="outline" className="border-primary font-normal text-primary">
                {evidence}
              </Badge>
            ) : null}
            {thick ? <EventFactChips event={event} /> : null}
            {thick ? <EventMomentumBadge event={event} /> : null}
            {event.has_update ? (
              <Badge className="gap-1">
                <Bell className="size-3" />
                {t("card.hasUpdate")}
              </Badge>
            ) : null}
          </div>
        ) : null}
        <Link
          to={`/app/events/${event.id}`}
          className="text-base leading-snug font-semibold hover:underline"
        >
          {event.title}
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {event.source_names.length > 0 ? (
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {event.source_names.slice(0, 3).map((name, index) => (
                <span key={`${name}-${index}`} className="inline-flex items-center gap-1">
                  <SourceIcon url={event.source_icon_urls[index]} className="size-3.5" />
                  {name}
                </span>
              ))}
              {event.source_names.length > 3 ? (
                <span>+{event.source_names.length - 3}</span>
              ) : null}
            </span>
          ) : null}
          <RelativeTime iso={event.last_activity_at} />
        </div>
      </CardContent>
    </Card>
  );
}
