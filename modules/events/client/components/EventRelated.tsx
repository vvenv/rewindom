import { Card, CardContent, CardHeader, CardTitle } from "@rewindom/ui/card";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { RelativeTime } from "./RelativeTime.js";

import type { EventRelatedItem } from "../../shared/index.js";

/**
 * 相关事件。
 *
 * **不是同一件事**——同一件事已经被聚类合并掉了（0.85），这里是 0.75~0.85 那一段：
 * 「WHO 与瑞士签协议」与「WHO 与荷兰签协议」是两件事，但读者显然想一起看。
 *
 * 没有相关事件就整块不渲染（没配 embedding key 时恒为空），
 * 与势头角标、修订区块同一条口径：没有可主张的就留白。
 */
export function EventRelated({ related }: { related: EventRelatedItem[] }) {
  const { t } = useTranslation("events");
  if (related.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("detail.related")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2 text-sm">
          {related.map((item) => (
            <li key={item.id} className="flex flex-wrap items-baseline gap-x-2">
              <Link
                to={`/app/events/${item.id}`}
                className="font-medium hover:underline"
              >
                {item.title}
              </Link>
              <span className="text-muted-foreground text-xs">
                <RelativeTime iso={item.last_activity_at} />
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
