import { useCallback, useState } from "react";

import {
  ApiError,
  EmptyState,
  Pagination,
  useConfirm,
  usePermissions,
} from "@be-water/module-sdk/client";
import { Alert, AlertDescription } from "@be-water/ui/alert";
import { Button } from "@be-water/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@be-water/ui/card";
import { Skeleton } from "@be-water/ui/skeleton";
import { toast } from "@be-water/ui/toast";
import { Bookmark as BookmarkIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useDeleteBookmark } from "../hooks/useBookmarkMutations.js";

import { BookmarkCard } from "./BookmarkCard.js";

import type { BookmarkListItem } from "../../shared/index.js";

/** 骨架屏铺满首屏但不必铺满整页，取一行半的量。 */
const SKELETON_COUNT = 6;

const GRID_CLASS = "grid gap-4 sm:grid-cols-2 xl:grid-cols-3";

interface BookmarksGridProps {
  bookmarks: BookmarkListItem[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  page: number;
  pageSize: number;
  total: number;
  pageCount?: number;
  isFiltered: boolean;
  onRetry: () => void;
}

export function BookmarksGrid({
  bookmarks,
  isLoading,
  isError,
  error,
  page,
  pageSize,
  total,
  pageCount,
  isFiltered,
  onRetry,
}: BookmarksGridProps) {
  const { t } = useTranslation("bookmark");
  const { confirm } = useConfirm();
  const deleteMutation = useDeleteBookmark();
  const { hasPermission } = usePermissions();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const canWrite = hasPermission("bookmark.write");

  const handleDelete = useCallback(
    async (bookmark: BookmarkListItem) => {
      const confirmed = await confirm({
        title: t("deleteConfirmTitle"),
        description: t("deleteConfirmDescription", { title: bookmark.title }),
        destructive: true,
      });
      if (!confirmed) {
        return;
      }

      setDeletingId(bookmark.id);
      try {
        await deleteMutation.mutateAsync(bookmark.id);
        toast.success(t("toastDeleted"));
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : t("deleteFailed"));
      } finally {
        setDeletingId(null);
      }
    },
    [confirm, deleteMutation, t],
  );

  if (isLoading) {
    return <BookmarksGridSkeleton />;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>
            {error instanceof Error ? error.message : t("loadFailed")}
          </AlertDescription>
        </Alert>
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t("retry")}
        </Button>
      </div>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <EmptyState
        icon={BookmarkIcon}
        title={isFiltered ? t("emptyFiltered") : t("empty")}
        description={isFiltered ? t("emptyFilteredHint") : t("emptyHint")}
      />
    );
  }

  const resolvedPageCount =
    pageCount ?? Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-4">
      <div className={GRID_CLASS}>
        {bookmarks.map((bookmark) => (
          <BookmarkCard
            key={bookmark.id}
            bookmark={bookmark}
            canWrite={canWrite}
            isDeleting={deletingId === bookmark.id}
            onDelete={(target) => void handleDelete(target)}
          />
        ))}
      </div>
      <Pagination
        currentPage={page}
        pageCount={resolvedPageCount}
        pageSize={pageSize}
        total={total}
        canPrev={page > 1}
        canNext={page < resolvedPageCount}
      />
    </div>
  );
}

function BookmarksGridSkeleton() {
  return (
    <div className={GRID_CLASS} aria-hidden>
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <Card key={index}>
          <CardHeader>
            <Skeleton className="h-5 w-2/3" />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-3 w-24" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
