import { PageLayout, usePermissions } from "@rewindom/module-sdk/client";
import { DraggableFabTrigger } from "@rewindom/ui/draggable-fab";
import { Bookmark as BookmarkIcon, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { BookmarkCreateSheet } from "../components/BookmarkCreateSheet.js";
import { BookmarkFilters } from "../components/BookmarkFilters.js";
import { BookmarksGrid } from "../components/BookmarksGrid.js";
import { useBookmarkHosts, useBookmarks } from "../hooks/useBookmarks.js";
import { useBookmarksPage } from "../hooks/useBookmarksPage.js";

export function Bookmarks() {
  const { t } = useTranslation("bookmark");
  const {
    q,
    host,
    hostValue,
    page,
    pageSize,
    sortBy,
    sortDir,
    sortValue,
    isFiltered,
    handleSortChange,
    handleFiltersChange,
    handleHostChange,
    handleReset,
  } = useBookmarksPage();
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("bookmark.write");
  const { data, isLoading, isError, error, refetch } = useBookmarks({
    page,
    pageSize,
    q,
    host,
    sortBy,
    sortDir,
  });
  const { data: hostsData } = useBookmarkHosts();

  return (
    <PageLayout
      icon={BookmarkIcon}
      title={t("title")}
      description={t("pageDescription")}
      action={
        canWrite ? (
          <BookmarkCreateSheet>
            <DraggableFabTrigger storageKey="bookmarks_create_fab">
              <Plus className="size-6 md:size-4" />
              <span className="hidden md:inline">{t("create")}</span>
            </DraggableFabTrigger>
          </BookmarkCreateSheet>
        ) : null
      }
    >
      <div className="flex flex-col gap-4">
        <BookmarkFilters
          q={q}
          hostValue={hostValue}
          hosts={hostsData?.items ?? []}
          sortValue={sortValue}
          isFiltered={isFiltered}
          onFiltersChange={handleFiltersChange}
          onHostChange={handleHostChange}
          onSortChange={handleSortChange}
          onReset={handleReset}
        />
        <BookmarksGrid
          bookmarks={data?.items ?? []}
          isLoading={isLoading && !data}
          isError={isError && !data}
          error={error}
          page={page}
          pageSize={pageSize}
          total={data?.total ?? 0}
          pageCount={data?.page_count}
          isFiltered={isFiltered}
          onRetry={() => void refetch()}
        />
      </div>
    </PageLayout>
  );
}
