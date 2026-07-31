import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@be-water/ui/card";
import { Skeleton } from "@be-water/ui/skeleton";
import { ArrowRight, ListTodo } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { useTodos } from "../hooks/useTodos.js";

const PREVIEW_COUNT = 5;

/** 工作台卡片：未完成待办数量 + 前几条。 */
export function TodosDashboardWidget() {
  const { t } = useTranslation("todos");
  const { data, isLoading, isError } = useTodos(
    1,
    PREVIEW_COUNT,
    undefined,
    false,
  );
  const todos = data?.items ?? [];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListTodo className="size-4 text-primary" />
          {t("title")}
          {data ? (
            <span className="text-sm font-normal text-muted-foreground">
              {t("widget.activeCount", { count: data.active_count })}
            </span>
          ) : null}
        </CardTitle>
        <CardAction>
          <Link
            to="/todos"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            {t("widget.viewAll")}
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
          <p className="text-sm text-muted-foreground">{t("widget.loadFailed")}</p>
        ) : todos.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("widget.noActive")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {todos.map((todo) => (
              <li key={todo.id} className="flex items-center gap-2 text-sm">
                <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                <span className="min-w-0 flex-1 truncate">{todo.title}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
