import { Card, CardContent, CardHeader, CardTitle } from "@rewindom/ui/card";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { EventFactChips } from "./EventFactChips.js";

import {
  describeEventFacts,
  sortRelatedForReading,
  type EventRelatedItem,
} from "../../shared/index.js";

/**
 * 相关事件。
 *
 * **不是同一件事**——同一件事已经被聚类合并掉了（0.85），这里是 0.75~0.85 那一段。
 * 按时间升序排，当成连续记录读；不写「为什么相关」。
 *
 * 没有相关事件就整块不渲染（没配 embedding key 时恒为空），
 * 与势头角标、修订区块同一条口径：没有可主张的就留白。
 */
export function EventRelated({ related }: { related: EventRelatedItem[] }) {
  const { t, i18n } = useTranslation("events");
  if (related.length === 0) {
    return null;
  }

  const ordered = sortRelatedForReading(related);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("detail.related")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-3">
          {ordered.map((item) => (
            <li key={item.id} className="flex flex-col gap-1">
              <time
                className="text-muted-foreground text-xs tabular-nums"
                dateTime={item.last_activity_at}
              >
                {new Date(item.last_activity_at).toLocaleDateString(i18n.language, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </time>
              <RelatedFacts item={item} />
              <Link
                to={`/app/events/${item.id}`}
                className="font-medium hover:underline"
              >
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function RelatedFacts({ item }: { item: EventRelatedItem }) {
  if (describeEventFacts(item.kind, item.facts).length === 0) {
    return null;
  }
  return (
    <div className="flex flex-wrap items-center gap-1">
      <EventFactChips event={item} />
    </div>
  );
}
