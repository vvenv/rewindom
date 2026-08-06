import { formatBusinessDateOrTimeAgo } from "@be-water/shared";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@be-water/ui/card";
import { Skeleton } from "@be-water/ui/skeleton";
import { ArrowRight, StickyNote } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { useNotes } from "../hooks/useNotes.js";

const RECENT_COUNT = 5;

/** 工作台卡片：最近更新的笔记 + 进入笔记列表的入口。 */
export function NotesDashboardWidget() {
  const { t } = useTranslation("notes");
  const { data, isLoading, isError } = useNotes(1, RECENT_COUNT);
  const notes = data?.items ?? [];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <StickyNote className="size-4 text-primary" />
          {t("dashboardTitle")}
        </CardTitle>
        <CardAction>
          <Link
            to="/app/notes"
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
          <p className="text-sm text-muted-foreground">{t("dashboardLoadFailed")}</p>
        ) : notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("dashboardEmpty")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {notes.map((note) => (
              <li key={note.id} className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{note.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatBusinessDateOrTimeAgo(note.updated_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
