import { api, PageLayout, usePermissions } from "@be-water/module-sdk/client";
import { Button } from "@be-water/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@be-water/ui/card";
import { DraggableFabTrigger } from "@be-water/ui/draggable-fab";
import { Spinner } from "@be-water/ui/spinner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark as BookmarkIcon, ExternalLink, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { BookmarkCreateSheet } from "../components/BookmarkCreateSheet.js";

import type { ExternalBookmarkListResult } from "../../shared/index.js";

const BOOKMARKS_QUERY_KEY = ["example-external", "bookmarks"] as const;
const PAGE_SIZE = 50;

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

export function Bookmarks() {
  const { t } = useTranslation("example-external");
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("example-external.write");
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: BOOKMARKS_QUERY_KEY,
    queryFn: () =>
      api.get<ExternalBookmarkListResult>("/example-external", {
        page: 1,
        page_size: PAGE_SIZE,
      }),
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: BOOKMARKS_QUERY_KEY });

  const items = data?.items ?? [];

  return (
    <PageLayout
      icon={BookmarkIcon}
      title={t("title")}
      description={t("pageDescription")}
      action={
        canWrite ? (
          <BookmarkCreateSheet onCreated={refresh}>
            <DraggableFabTrigger storageKey="example_external_create_fab">
              <Plus className="size-6 md:size-4" />
              <span className="hidden md:inline">{t("create")}</span>
            </DraggableFabTrigger>
          </BookmarkCreateSheet>
        ) : null
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Spinner className="size-4" />
          <span className="text-sm">{t("loading")}</span>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
          <p className="text-sm">{t("loadFailed")}</p>
          <Button variant="outline" size="sm" onClick={refresh}>
            {t("retry")}
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
          <BookmarkIcon className="size-12 opacity-30" />
          <p className="text-sm">{t("empty")}</p>
          <p className="text-xs opacity-70">{t("emptyHint")}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <Card key={item.id} size="sm">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate hover:underline"
                  >
                    {item.title}
                  </a>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="size-3" />
                    {t("open")}
                  </a>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1">
                {item.description_preview ? (
                  <p className="text-sm text-muted-foreground">
                    {item.description_preview}
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  {t("updatedAt", { time: formatDate(item.updated_at) })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
