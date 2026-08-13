import { useMemo, useState } from "react";

import {
  ApiError,
  DataTable,
  DataTableColumnHeader,
  type DataTableFeatures,
  useConfirm,
  usePermissions,
} from "@rewindom/client-kit";
import { Badge } from "@rewindom/ui/badge";
import { Button } from "@rewindom/ui/button";
import { toast } from "@rewindom/ui/toast";
import { ShieldCheck, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useDeleteRole } from "../hooks/useRoleMutations.js";

import { RoleEditSheet } from "./RoleSheet.js";

import type { RoleDetail } from "@rewindom/shared";
import type { ColumnDef, SortingState } from "@tanstack/react-table";

interface RolesTableProps {
  roles: RoleDetail[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onRetry: () => void;
}

export function RolesTable({
  roles,
  isLoading,
  isError,
  error,
  onRetry,
}: RolesTableProps) {
  const { t } = useTranslation(["rbac", "common"]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const { hasPermission } = usePermissions();
  const { confirm } = useConfirm();
  const deleteMutation = useDeleteRole();

  const canWrite = hasPermission("roles.write");

  const columns = useMemo<ColumnDef<DataTableFeatures, RoleDetail>[]>(() => {
    const handleDelete = async (role: RoleDetail) => {
      const ok = await confirm({
        title: t("table.deleteConfirmTitle"),
        description: t("table.deleteConfirmDescription", { name: role.name }),
        confirmText: t("common:delete"),
        destructive: true,
      });
      if (!ok) return;

      try {
        await deleteMutation.mutateAsync(role.id);
        toast.success(t("table.roleDeleted"));
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : t("table.deleteFailed"),
        );
      }
    };

    return [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.role")} />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.original.name}</span>
            {row.original.is_builtin && (
              <Badge variant="secondary">{t("table.builtin")}</Badge>
            )}
          </div>
        ),
      },
      {
        accessorKey: "description",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("table.description")}
          />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.description || "—"}
          </span>
        ),
      },
      {
        id: "permissions",
        header: t("table.permissionCount"),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.permissions.length}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          if (!canWrite) {
            return null;
          }
          return (
            <div className="flex justify-end gap-1">
              <RoleEditSheet role={row.original} />
              {!row.original.is_builtin && (
                <Button
                  variant="ghost"
                  size="sm"
                  title={t("table.deleteRole")}
                  disabled={deleteMutation.isPending}
                  onClick={() => void handleDelete(row.original)}
                >
                  <Trash2 />
                </Button>
              )}
            </div>
          );
        },
      },
    ];
  }, [canWrite, confirm, deleteMutation, t]);

  return (
    <DataTable
      columns={columns}
      data={roles}
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={onRetry}
      emptyIcon={ShieldCheck}
      emptyTitle={t("table.empty")}
      emptyDescription={t("table.emptyHint")}
      sorting={sorting}
      onSortingChange={setSorting}
      manualSorting={false}
    />
  );
}
