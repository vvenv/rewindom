import { useCallback, useMemo, useState } from "react";

import { ApiError, DataTable, DataTableColumnHeader , useConfirm , usePermissions  } from "@be-water/client-kit";
import { formatBusinessDateOrTimeAgo } from "@be-water/shared";
import { Button } from "@be-water/ui/button";
import { toast } from "@be-water/ui/toast";
import { StickyNote, Trash2 } from "lucide-react";

import { useDeleteNote } from "../hooks/useNoteMutations.js";

import { NoteEditSheet } from "./NoteEditSheet.js";

import type { NoteListItem } from "../../shared/index.js";
import type { ColumnDef, SortingState, Updater } from "@tanstack/react-table";

interface NotesTableProps {
  notes: NoteListItem[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  page: number;
  pageSize: number;
  total: number;
  pageCount?: number;
  q?: string;
  sorting: SortingState;
  onSortingChange: (updater: Updater<SortingState>) => void;
  onRetry: () => void;
}

export function NotesTable({
  notes,
  isLoading,
  isError,
  error,
  page,
  pageSize,
  total,
  pageCount,
  q,
  sorting,
  onSortingChange,
  onRetry,
}: NotesTableProps) {
  const { confirm } = useConfirm();
  const deleteMutation = useDeleteNote();
  const { hasPermission } = usePermissions();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const canWrite = hasPermission("notes.write");

  const handleDelete = useCallback(
    async (note: NoteListItem) => {
      const confirmed = await confirm({
        title: "删除笔记",
        description: `确定删除「${note.title}」吗？此操作不可撤销。`,
        destructive: true,
      });
      if (!confirmed) {
        return;
      }

      setDeletingId(note.id);
      try {
        await deleteMutation.mutateAsync(note.id);
        toast.success("笔记已删除");
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "删除失败，请重试");
      } finally {
        setDeletingId(null);
      }
    },
    [confirm, deleteMutation],
  );

  const columns = useMemo<ColumnDef<NoteListItem>[]>(
    () => [
      {
        accessorKey: "title",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="标题" />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <div className="font-medium">{row.original.title}</div>
        ),
      },
      {
        accessorKey: "content_preview",
        header: "摘要",
        cell: ({ row }) => (
          <div className="text-muted-foreground line-clamp-2 max-w-xl text-sm">
            {row.original.content_preview || "—"}
          </div>
        ),
      },
      {
        accessorKey: "updated_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="更新时间" />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {formatBusinessDateOrTimeAgo(row.original.updated_at)}
          </span>
        ),
      },
      ...(canWrite
        ? [
            {
              id: "actions",
              header: "操作",
              cell: ({ row }: { row: { original: NoteListItem } }) => (
                <div className="flex items-center gap-1">
                  <NoteEditSheet note={row.original} />
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="删除笔记"
                    disabled={deletingId === row.original.id}
                    onClick={() => void handleDelete(row.original)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ),
            } satisfies ColumnDef<NoteListItem>,
          ]
        : []),
    ],
    [canWrite, deletingId, handleDelete],
  );

  return (
    <DataTable
      columns={columns}
      data={notes}
      isLoading={isLoading && notes.length === 0}
      isError={isError && notes.length === 0}
      error={error}
      page={page}
      pageSize={pageSize}
      total={total}
      pageCount={pageCount}
      emptyIcon={<StickyNote className="size-10" />}
      emptyHeader="暂无笔记"
      emptyMessage={
        q ? "没有匹配的笔记，请调整搜索条件。" : "创建第一条笔记开始使用。"
      }
      onRetry={onRetry}
      sorting={sorting}
      onSortingChange={onSortingChange}
    />
  );
}
