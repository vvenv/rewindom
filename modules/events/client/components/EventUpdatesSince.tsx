import { Card, CardContent, CardHeader, CardTitle } from "@rewindom/ui/card";
import { useTranslation } from "react-i18next";

import { RelativeTime } from "./RelativeTime.js";

import type { EventRevisionItem } from "../../shared/index.js";

/**
 * 「自你上次看之后发生了什么」。
 *
 * 这是本模块唯一竞品结构上给不出的东西：每轮重新聚类的产品没有连续观察记录，
 * 事后补算不出来。所以这里只说**可核对的事实**，不做概括、不下判断。
 *
 * 没有修订就整块不渲染——与势头角标同一条口径：没有可主张的变化时留白。
 */
export function EventUpdatesSince({
  revisions,
  isFollowing,
}: {
  revisions: EventRevisionItem[];
  isFollowing: boolean;
}) {
  const { t } = useTranslation("events");
  if (revisions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {isFollowing ? t("updates.sinceLastSeen") : t("updates.recent")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2 text-sm">
          {revisions.map((revision) => (
            <li
              key={`${revision.kind}-${revision.occurred_at}`}
              className="flex flex-wrap items-baseline gap-x-2"
            >
              <span>{describe(revision, t)}</span>
              <span className="text-muted-foreground text-xs">
                <RelativeTime iso={revision.occurred_at} />
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function describe(
  revision: EventRevisionItem,
  t: (key: string, params?: Record<string, unknown>) => string,
): string {
  switch (revision.kind) {
    case "source_joined":
      return t("updates.sourceJoined", {
        source: String(revision.after.source_name ?? ""),
      });
    case "status_changed":
      // 阶段名走既有的 status.* 文案表，不另起一套
      return t("updates.statusChanged", {
        status: t(`status.${String(revision.after.status ?? "")}`),
      });
    case "summary_rewritten":
      return t("updates.summaryRewritten");
    case "title_changed":
      return t("updates.titleChanged");
  }
}
