import { formatBusinessDateOrTimeAgo } from "@rewindom/module-sdk/client";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@rewindom/ui/card";
import { Skeleton } from "@rewindom/ui/skeleton";
import { ArrowRight, Bookmark as BookmarkIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { useBookmarks } from "../hooks/useBookmarks.js";

const RECENT_COUNT = 5;

/** 工作台卡片：最近更新的书签 + 进入书签列表的入口。 */
export function BookmarksDashboardWidget() {
  const { t } = useTranslation("bookmark");
  const { data, isLoading, isError } = useBookmarks({
    page: 1,
    pageSize: RECENT_COUNT,
  });
  const bookmarks = data?.items ?? [];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookmarkIcon className="size-4 text-primary" />
          {t("dashboardTitle")}
        </CardTitle>
        <CardAction>
          <Link
            to="/app/bookmarks"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            {t("dashboardViewAll")}
            <ArrowRight className="size-3.5" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        ) : isError ? (
          <p className="text-sm text-muted-foreground">
            {t("dashboardLoadFailed")}
          </p>
        ) : bookmarks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("dashboardEmpty")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {bookmarks.map((bookmark) => (
              <li key={bookmark.id} className="flex items-center gap-2 text-sm">
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={bookmark.url}
                  className="min-w-0 flex-1 truncate hover:underline"
                >
                  {bookmark.title}
                </a>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatBusinessDateOrTimeAgo(bookmark.updated_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
