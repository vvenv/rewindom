import { useCallback, useMemo, useState } from "react";

import {
  ApiError,
  DataTable,
  DataTableColumnHeader,
  useConfirm,
  usePermissions,
  type DataTableFeatures,
  formatBusinessDateOrTimeAgo,
} from "@rewindom/module-sdk/client";
import { Button } from "@rewindom/ui/button";
import { Checkbox } from "@rewindom/ui/checkbox";
import { toast } from "@rewindom/ui/toast";
import { Quote, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useDeleteThing, useUpdateThing } from "../hooks/useThingMutations.js";

import { ThingEditSheet } from "./ThingEditSheet.js";

import type { ThingListItem } from "../../shared/index.js";
import type { ColumnDef, SortingState, Updater } from "@tanstack/react-table";

interface ThingsTableProps {
  items: ThingListItem[];
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

export function ThingsTable({
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
}: ThingsTableProps) {
  const { confirm } = useConfirm();
  const deleteMutation = useDeleteThing();
  const updateMutation = useUpdateThing();
  const { t } = useTranslation("useless");
  const { hasPermission } = usePermissions();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const canWrite = hasPermission("things.write");

  const handleToggleEnabled = useCallback(
    async (item: ThingListItem, next: boolean) => {
      setTogglingId(item.id);
      try {
        await updateMutation.mutateAsync({ id: item.id, enabled: next });
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : t("updateFailed"));
      } finally {
        setTogglingId(null);
      }
    },
    [updateMutation, t],
  );

  const handleDelete = useCallback(
    async (item: ThingListItem) => {
      const confirmed = await confirm({
        title: t("deleteConfirmTitle"),
        description: t("deleteConfirmDescription", { text: item.text }),
        destructive: true,
      });
      if (!confirmed) {
        return;
      }

      setDeletingId(item.id);
      try {
        await deleteMutation.mutateAsync(item.id);
        toast.success(t("deleted"));
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : t("deleteFailed"));
      } finally {
        setDeletingId(null);
      }
    },
    [confirm, deleteMutation, t],
  );

  const columns = useMemo<ColumnDef<DataTableFeatures, ThingListItem>[]>(
    () => [
      {
        accessorKey: "text",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("fieldText")} />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <div className="text-muted-foreground line-clamp-2 max-w-xl text-sm">
            {row.original.text || "—"}
          </div>
        ),
      },
      {
        accessorKey: "enabled",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("fieldEnabled")} />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <Checkbox
            checked={row.original.enabled}
            disabled={!canWrite || togglingId === row.original.id}
            aria-label={t("fieldEnabled")}
            onCheckedChange={(checked) =>
              void handleToggleEnabled(row.original, checked === true)
            }
          />
        ),
      },
      {
        accessorKey: "updated_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("fieldUpdatedAt")} />
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
              header: t("columnActions"),
              cell: ({ row }: { row: { original: ThingListItem } }) => (
                <div className="flex items-center gap-1">
                  <ThingEditSheet item={row.original} />
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={t("deleteAriaLabel")}
                    disabled={deletingId === row.original.id}
                    onClick={() => void handleDelete(row.original)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ),
            } satisfies ColumnDef<DataTableFeatures, ThingListItem>,
          ]
        : []),
    ],
    [canWrite, deletingId, handleDelete, togglingId, handleToggleEnabled, t],
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
      emptyIcon={Quote}
      emptyTitle={t("emptyHeader")}
      emptyDescription={q ? t("emptyMessageFiltered") : t("emptyMessage")}
      onRetry={onRetry}
      sorting={sorting}
      onSortingChange={onSortingChange}
    />
  );
}
