import { useCallback, useState } from "react";

import {
  ApiError,
  Pagination,
  useConfirm,
  usePermissions,
} from "@be-water/module-sdk/client";
import { Alert, AlertDescription } from "@be-water/ui/alert";
import { Button } from "@be-water/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@be-water/ui/card";
import { Skeleton } from "@be-water/ui/skeleton";
import { toast } from "@be-water/ui/toast";
import { StickyNote } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useDeleteNote } from "../hooks/useNoteMutations.js";

import { NoteCard } from "./NoteCard.js";

import type { NoteListItem } from "../../shared/index.js";

/** 骨架屏铺满首屏但不必铺满整页，取一行半的量。 */
const SKELETON_COUNT = 6;

const GRID_CLASS = "grid gap-4 sm:grid-cols-2 xl:grid-cols-3";

interface NotesGridProps {
  notes: NoteListItem[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  page: number;
  pageSize: number;
  total: number;
  pageCount?: number;
  q?: string;
  onRetry: () => void;
}

export function NotesGrid({
  notes,
  isLoading,
  isError,
  error,
  page,
  pageSize,
  total,
  pageCount,
  q,
  onRetry,
}: NotesGridProps) {
  const { t } = useTranslation("note");
  const { confirm } = useConfirm();
  const deleteMutation = useDeleteNote();
  const { hasPermission } = usePermissions();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const canWrite = hasPermission("note.write");

  const handleDelete = useCallback(
    async (note: NoteListItem) => {
      const confirmed = await confirm({
        title: t("deleteConfirmTitle"),
        description: t("deleteConfirmDescription", { title: note.title }),
        destructive: true,
      });
      if (!confirmed) {
        return;
      }

      setDeletingId(note.id);
      try {
        await deleteMutation.mutateAsync(note.id);
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
    return <NotesGridSkeleton />;
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

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <div className="rounded-full bg-muted p-4">
          <StickyNote className="size-10" />
        </div>
        <div className="space-y-1 text-center">
          <p className="text-sm font-medium">{t("emptyTitle")}</p>
          <p className="text-sm text-muted-foreground">
            {q ? t("emptyWithSearch") : t("emptyNoSearch")}
          </p>
        </div>
      </div>
    );
  }

  const resolvedPageCount =
    pageCount ?? Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-4">
      <div className={GRID_CLASS}>
        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            canWrite={canWrite}
            isDeleting={deletingId === note.id}
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

function NotesGridSkeleton() {
  return (
    <div className={GRID_CLASS} aria-hidden>
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <Card key={index}>
          <CardHeader>
            <Skeleton className="h-5 w-2/3" />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
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
