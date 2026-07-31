import { useMemo } from "react";

import {
  ApiError,
  DataTable,
  DataTableColumnHeader,
  useAuth,
  useConfirm,
} from "@be-water/client-kit";
import { formatBusinessDateOrTimeAgo } from "@be-water/shared";
import { Button } from "@be-water/ui/button";
import { Input } from "@be-water/ui/input";
import { Switch } from "@be-water/ui/switch";
import { toast } from "@be-water/ui/toast";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import {
  useDeletePlatformAdmin,
  useUpdatePlatformAdmin,
} from "../hooks/usePlatformAdmins.js";

import { PlatformAdminRoleSheet } from "./PlatformAdminRoleSheet.js";
import { PlatformAdminSheet } from "./PlatformAdminSheet.js";
import { PlatformRoleManageSheet } from "./PlatformRoleManageSheet.js";

import type { PlatformAdminListItem } from "../../shared/index.js";
import type { ColumnDef, SortingState, Updater } from "@tanstack/react-table";

function AdminRoleBadge({
  isSystemAdmin,
  t,
}: {
  isSystemAdmin: boolean;
  t: TFunction<["platform", "common"]>;
}) {
  return (
    <span
      className={
        isSystemAdmin
          ? "rounded-full bg-purple-100 px-2 py-1 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
          : "rounded-full bg-blue-100 px-2 py-1 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
      }
    >
      {isSystemAdmin
        ? t("admins.table.systemAdmin")
        : t("admins.table.regularAdmin")}
    </span>
  );
}

interface AdminRowActionsProps {
  admin: PlatformAdminListItem;
  canManageAdmins: boolean;
  canAssignRoles: boolean;
  t: TFunction<["platform", "common"]>;
}

function AdminRowActions({
  admin,
  canManageAdmins,
  canAssignRoles,
  t,
}: AdminRowActionsProps) {
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const deleteMutation = useDeletePlatformAdmin();
  const updateMutation = useUpdatePlatformAdmin();
  const isSelf = user?.id === admin.id;

  const handleToggle = async (enabled: boolean) => {
    try {
      await updateMutation.mutateAsync({ id: admin.id, enabled });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("common:updateFailed"));
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: t("admins.deleteTitle"),
      description: t("admins.deleteDescription", { username: admin.username }),
      confirmText: t("common:delete"),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteMutation.mutateAsync(admin.id);
      toast.success(t("admins.deleted"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("admins.deleteFailed"));
    }
  };

  return (
    <div className="flex justify-end gap-1">
      {canAssignRoles && !admin.is_system_admin && (
        <PlatformAdminRoleSheet admin={admin} />
      )}
      {canManageAdmins && (
        <PlatformAdminSheet
          admin={admin}
          disabled={admin.is_system_admin && isSelf}
          trigger={
            <Button variant="ghost" size="icon-sm" title={t("common:edit")}>
              <Pencil className="size-3.5" />
            </Button>
          }
        />
      )}
      {canManageAdmins && !isSelf && !admin.is_system_admin && (
        <Button
          variant="ghost"
          size="icon-sm"
          title={t("common:delete")}
          className="hover:text-destructive"
          onClick={() => void handleDelete()}
          disabled={deleteMutation.isPending}
        >
          <Trash2 className="size-3.5" />
        </Button>
      )}
      {canManageAdmins && (
        <Switch
          checked={admin.enabled}
          onCheckedChange={(value) => void handleToggle(value)}
          disabled={
            updateMutation.isPending || admin.is_system_admin || isSelf
          }
          aria-label={
            admin.enabled
              ? t("admins.disableAccount")
              : t("admins.enableAccount")
          }
        />
      )}
    </div>
  );
}

interface PlatformAdminsTableProps {
  admins: PlatformAdminListItem[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  search?: string;
  onSearchChange: (value: string) => void;
  canManageAdmins: boolean;
  canAssignRoles: boolean;
  canManageRoles: boolean;
  onRetry: () => void;
  sorting: SortingState;
  onSortingChange: (updater: Updater<SortingState>) => void;
}

export function PlatformAdminsTable({
  admins,
  isLoading,
  isError,
  error,
  page,
  pageSize,
  total,
  pageCount,
  search,
  onSearchChange,
  canManageAdmins,
  canAssignRoles,
  canManageRoles,
  onRetry,
  sorting,
  onSortingChange,
}: PlatformAdminsTableProps) {
  const { t } = useTranslation(["platform", "common"]);

  const columns = useMemo<ColumnDef<PlatformAdminListItem>[]>(
    () => [
      {
        accessorKey: "username",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("admins.table.username")} />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.username}</span>
        ),
      },
      {
        accessorKey: "is_system_admin",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("admins.table.type")} />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <AdminRoleBadge isSystemAdmin={row.original.is_system_admin} t={t} />
        ),
      },
      {
        id: "roles",
        header: t("admins.table.roles"),
        meta: { cellClassName: "text-muted-foreground" },
        cell: ({ row }) =>
          row.original.is_system_admin
            ? t("admins.table.allPermissions")
            : row.original.roles.map((r) => r.name).join("、") ||
              t("admins.table.none"),
      },
      {
        accessorKey: "enabled",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("admins.table.status")} />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <span
            className={
              row.original.enabled
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground"
            }
          >
            {row.original.enabled ? t("common:enabled") : t("common:disabled")}
          </span>
        ),
      },
      {
        accessorKey: "last_login_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("admins.table.lastLogin")} />
        ),
        enableSorting: true,
        meta: { cellClassName: "text-muted-foreground hidden sm:table-cell" },
        cell: ({ row }) =>
          row.original.last_login_at
            ? formatBusinessDateOrTimeAgo(row.original.last_login_at)
            : t("users.table.neverLoggedIn"),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">{t("common:actions")}</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <AdminRowActions
            admin={row.original}
            canManageAdmins={canManageAdmins}
            canAssignRoles={canAssignRoles}
            t={t}
          />
        ),
      },
    ],
    [canAssignRoles, canManageAdmins, t],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">{t("admins.description")}</p>
        <div className="flex gap-2">
          {canManageRoles && <PlatformRoleManageSheet />}
          {canManageAdmins && (
            <PlatformAdminSheet
              trigger={
                <Button variant="outline" size="sm">
                  <Plus className="size-4" />
                  {t("admins.create")}
                </Button>
              }
            />
          )}
        </div>
      </div>

      <Input
        className="max-w-sm"
        placeholder={t("admins.searchPlaceholder")}
        value={search ?? ""}
        onChange={(e) => onSearchChange(e.target.value)}
      />

      <DataTable
        columns={columns}
        data={admins}
        isLoading={isLoading && admins.length === 0}
        isError={isError && admins.length === 0}
        error={error}
        onRetry={onRetry}
        page={page}
        pageSize={pageSize}
        total={total}
        pageCount={pageCount}
        emptyMessage={t("admins.emptyMessage")}
        emptyHeader={t("admins.emptyHeader")}
        emptyIcon={<Users className="size-6 text-muted-foreground" />}
        sorting={sorting}
        onSortingChange={onSortingChange}
      />
    </div>
  );
}
