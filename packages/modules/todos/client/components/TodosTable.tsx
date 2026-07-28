import { useCallback, useMemo, useState } from "react";

import {
  ApiError,
  DataTable,
  DataTableColumnHeader,
  useConfirm,
  usePermissions,
} from "@be-water/client-kit";
import { formatBusinessDateOrTimeAgo } from "@be-water/shared";
import { Button } from "@be-water/ui/button";
import { Checkbox } from "@be-water/ui/checkbox";
import { toast } from "@be-water/ui/toast";
import { cn } from "@be-water/ui/utils";
import { ListTodo, Trash2 } from "lucide-react";

import { useDeleteTodo, useUpdateTodo } from "../hooks/useTodoMutations.js";

import { TodoEditSheet } from "./TodoEditSheet.js";

import type { TodoListItem } from "../../shared/index.js";
import type { ColumnDef, SortingState, Updater } from "@tanstack/react-table";

interface TodosTableProps {
  items: TodoListItem[];
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

export function TodosTable({
  items,
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
}: TodosTableProps) {
  const { confirm } = useConfirm();
  const deleteMutation = useDeleteTodo();
  const updateMutation = useUpdateTodo();
  const { hasPermission } = usePermissions();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const canWrite = hasPermission("todos.write");

  const handleToggleCompleted = useCallback(
    async (item: TodoListItem, next: boolean) => {
      setTogglingId(item.id);
      try {
        await updateMutation.mutateAsync({ id: item.id, completed: next });
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "更新失败，请重试");
      } finally {
        setTogglingId(null);
      }
    },
    [updateMutation],
  );

  const handleDelete = useCallback(
    async (item: TodoListItem) => {
      const confirmed = await confirm({
        title: "删除待办",
        description: `确定删除「${item.title}」吗？此操作不可撤销。`,
        destructive: true,
      });
      if (!confirmed) {
        return;
      }

      setDeletingId(item.id);
      try {
        await deleteMutation.mutateAsync(item.id);
        toast.success("已删除");
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "删除失败，请重试");
      } finally {
        setDeletingId(null);
      }
    },
    [confirm, deleteMutation],
  );

  const columns = useMemo<ColumnDef<TodoListItem>[]>(
    () => [
      {
        accessorKey: "title",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="标题" />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <div
            className={cn(
              "font-medium",
              // 已完成的划掉并压暗——一眼区分「还要做的」和「做完的」
              row.original.completed && "text-muted-foreground line-through",
            )}
          >
            {row.original.title || "—"}
          </div>
        ),
      },
      {
        accessorKey: "completed",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="已完成" />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <Checkbox
            checked={row.original.completed}
            disabled={!canWrite || togglingId === row.original.id}
            aria-label="已完成"
            onCheckedChange={(checked) =>
              void handleToggleCompleted(row.original, checked === true)
            }
          />
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
              cell: ({ row }: { row: { original: TodoListItem } }) => (
                <div className="flex items-center gap-1">
                  <TodoEditSheet item={row.original} />
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="删除"
                    disabled={deletingId === row.original.id}
                    onClick={() => void handleDelete(row.original)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ),
            } satisfies ColumnDef<TodoListItem>,
          ]
        : []),
    ],
    [canWrite, deletingId, handleDelete, togglingId, handleToggleCompleted],
  );

  return (
    <DataTable
      columns={columns}
      data={items}
      isLoading={isLoading && items.length === 0}
      isError={isError && items.length === 0}
      error={error}
      page={page}
      pageSize={pageSize}
      total={total}
      pageCount={pageCount}
      emptyIcon={<ListTodo className="size-10" />}
      emptyHeader="暂无待办"
      emptyMessage={
        q ? "没有匹配的待办，请调整搜索条件。" : "在上方输入框添加第一条待办。"
      }
      onRetry={onRetry}
      sorting={sorting}
      onSortingChange={onSortingChange}
    />
  );
}
