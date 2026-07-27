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

import {
  useDeletePlatformAdmin,
  useUpdatePlatformAdmin,
} from "../hooks/usePlatformAdmins.js";

import { PlatformAdminRoleSheet } from "./PlatformAdminRoleSheet.js";
import { PlatformAdminSheet } from "./PlatformAdminSheet.js";
import { PlatformRoleManageSheet } from "./PlatformRoleManageSheet.js";

import type { PlatformAdminListItem } from "../../shared/index.js";
import type { ColumnDef, SortingState, Updater } from "@tanstack/react-table";

function AdminRoleBadge({ isSystemAdmin }: { isSystemAdmin: boolean }) {
  return (
    <span
      className={
        isSystemAdmin
          ? "rounded-full bg-purple-100 px-2 py-1 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
          : "rounded-full bg-blue-100 px-2 py-1 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
      }
    >
      {isSystemAdmin ? "系统管理员" : "普通管理员"}
    </span>
  );
}

interface AdminRowActionsProps {
  admin: PlatformAdminListItem;
  canManageAdmins: boolean;
  canAssignRoles: boolean;
}

function AdminRowActions({
  admin,
  canManageAdmins,
  canAssignRoles,
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
      toast.error(err instanceof ApiError ? err.message : "更新失败");
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: "删除平台管理员",
      description: `确定删除管理员 ${admin.username}？此操作不可撤销。`,
      confirmText: "删除",
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteMutation.mutateAsync(admin.id);
      toast.success("已删除");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "删除失败");
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
            <Button variant="ghost" size="icon-sm" title="编辑">
              <Pencil className="size-3.5" />
            </Button>
          }
        />
      )}
      {canManageAdmins && !isSelf && !admin.is_system_admin && (
        <Button
          variant="ghost"
          size="icon-sm"
          title="删除"
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
          aria-label={admin.enabled ? "停用账号" : "启用账号"}
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
  const columns = useMemo<ColumnDef<PlatformAdminListItem>[]>(
    () => [
      {
        accessorKey: "username",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="账号" />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.username}</span>
        ),
      },
      {
        accessorKey: "is_system_admin",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="类型" />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <AdminRoleBadge isSystemAdmin={row.original.is_system_admin} />
        ),
      },
      {
        id: "roles",
        header: "角色",
        meta: { cellClassName: "text-muted-foreground" },
        cell: ({ row }) =>
          row.original.is_system_admin
            ? "全部平台权限"
            : row.original.roles.map((r) => r.name).join("、") || "无",
      },
      {
        accessorKey: "enabled",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="状态" />
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
            {row.original.enabled ? "启用" : "禁用"}
          </span>
        ),
      },
      {
        accessorKey: "last_login_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="最后登录" />
        ),
        enableSorting: true,
        meta: { cellClassName: "text-muted-foreground hidden sm:table-cell" },
        cell: ({ row }) =>
          row.original.last_login_at
            ? formatBusinessDateOrTimeAgo(row.original.last_login_at)
            : "从未登录",
      },
      {
        id: "actions",
        header: () => <span className="sr-only">操作</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <AdminRowActions
            admin={row.original}
            canManageAdmins={canManageAdmins}
            canAssignRoles={canAssignRoles}
          />
        ),
      },
    ],
    [canAssignRoles, canManageAdmins],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">管理平台管理员账号与角色</p>
        <div className="flex gap-2">
          {canManageRoles && <PlatformRoleManageSheet />}
          {canManageAdmins && (
            <PlatformAdminSheet
              trigger={
                <Button variant="outline" size="sm">
                  <Plus className="size-4" />
                  新建管理员
                </Button>
              }
            />
          )}
        </div>
      </div>

      <Input
        className="max-w-sm"
        placeholder="搜索账号..."
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
        emptyMessage="暂无平台管理员"
        emptyHeader="还没有平台管理员"
        emptyIcon={<Users className="size-6 text-muted-foreground" />}
        sorting={sorting}
        onSortingChange={onSortingChange}
      />
    </div>
  );
}
