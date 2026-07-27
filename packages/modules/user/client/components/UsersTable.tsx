import { useCallback, useMemo, useState } from "react";

import {
  ApiError,
  DataTable,
  DataTableColumnHeader,
  useAuth,
  useConfirm,
  usePermissions,
} from "@be-water/client-kit";
import { formatBusinessDate, formatBusinessDateOrTimeAgo, type TenantUserListItem } from "@be-water/shared";
import { Button } from "@be-water/ui/button";
import { Switch } from "@be-water/ui/switch";
import { toast } from "@be-water/ui/toast";
import { Trash2, Users as UsersIcon } from "lucide-react";

import { useDeleteUser } from "../hooks/useDeleteUser.js";
import { useDeleteUsers } from "../hooks/useDeleteUsers.js";
import { useUpdateUser } from "../hooks/useUpdateUser.js";

import { UserPermissionSheet } from "./UserPermissionSheet.js";
import { UserResetPasswordSheet } from "./UserResetPasswordSheet.js";
import { UserRoleBadge } from "./UserRoleBadge.js";
import { UserEditSheet } from "./UserSheet.js";

import type { ColumnDef, SortingState, Updater } from "@tanstack/react-table";

interface UsersTableProps {
  users: TenantUserListItem[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  page: number;
  pageSize: number;
  total: number;
  pageCount?: number;
  q?: string;
  admin_type?: string;
  sorting: SortingState;
  onSortingChange: (updater: Updater<SortingState>) => void;
  onRetry: () => void;
}

export function UsersTable({
  users,
  isLoading,
  isError,
  error,
  page,
  pageSize,
  total,
  pageCount,
  q,
  admin_type,
  sorting,
  onSortingChange,
  onRetry,
}: UsersTableProps) {
  const { confirm } = useConfirm();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();
  const deleteUsersMutation = useDeleteUsers();
  const { user: currentUser } = useAuth();
  const { hasPermission } = usePermissions();

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<TenantUserListItem[]>([]);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);
  const [tableKey, setTableKey] = useState(0);

  const handleToggle = useCallback(
    async (user: TenantUserListItem, enabled: boolean) => {
      setTogglingId(user.id);
      try {
        await updateMutation.mutateAsync({ id: user.id, enabled });
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "更新失败，请重试");
      } finally {
        setTogglingId(null);
      }
    },
    [updateMutation],
  );

  const handleDelete = useCallback(
    async (user: TenantUserListItem) => {
      const confirmed = await confirm({
        title: "确认删除用户",
        description: `确定要删除用户 "${user.username}" 吗？此操作无法撤销。`,
        destructive: true,
      });
      if (!confirmed) return;

      setDeletingId(user.id);
      try {
        await deleteMutation.mutateAsync(user.id);
        toast.success("已删除用户");
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "删除失败，请重试");
      } finally {
        setDeletingId(null);
      }
    },
    [confirm, deleteMutation],
  );

  const handleBatchDelete = useCallback(async () => {
    if (selectedUsers.length === 0) return;

    const confirmed = await confirm({
      title: "确认批量删除用户",
      description: `确定要删除选中的 ${selectedUsers.length} 个用户吗？此操作无法撤销。`,
      destructive: true,
    });
    if (!confirmed) return;

    setIsDeletingBatch(true);
    try {
      const userIds = selectedUsers.map((item) => item.id);
      await deleteUsersMutation.mutateAsync(userIds);
      toast.success(`已删除 ${userIds.length} 个用户`);
      setSelectedUsers([]);
      setTableKey((prev) => prev + 1);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "批量删除失败，请重试",
      );
    } finally {
      setIsDeletingBatch(false);
    }
  }, [selectedUsers, confirm, deleteUsersMutation]);

  const columns: ColumnDef<TenantUserListItem>[] = useMemo(
    () => [
      {
        accessorKey: "username",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="账号" />
        ),
        enableSorting: true,
        cell: ({ row }) => <span>{row.getValue("username")}</span>,
      },
      {
        id: "roles",
        header: "角色",
        enableSorting: false,
        cell: ({ row }) => {
          const user = row.original;
          if (user.is_system_admin) {
            return <UserRoleBadge isSystemAdmin />;
          }
          return (
            <span className="text-sm text-muted-foreground">
              {user.roles.map((r) => r.name).join("、") || "无"}
            </span>
          );
        },
      },
      {
        accessorKey: "enabled",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="启用" />
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const user = row.original;
          return (
            <Switch
              checked={user.enabled}
              onCheckedChange={(value: boolean) => handleToggle(user, value)}
              disabled={
                togglingId === user.id ||
                user.is_system_admin ||
                !hasPermission("users.write")
              }
              aria-label={user.enabled ? "停用账号" : "启用账号"}
            />
          );
        },
      },
      {
        accessorKey: "last_login_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="最后登录" />
        ),
        enableSorting: true,
        meta: { className: "hidden sm:table-cell" },
        cell: ({ row }) => {
          const lastLogin = row.getValue("last_login_at") as string | null;
          return (
            <span className="text-muted-foreground tabular-nums">
              {lastLogin ? formatBusinessDateOrTimeAgo(lastLogin) : "从未登录"}
            </span>
          );
        },
      },
      {
        accessorKey: "last_access_at",
        id: "last_access_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="最近访问" />
        ),
        enableSorting: true,
        meta: { className: "hidden md:table-cell" },
        cell: ({ row }) => {
          const lastAccess = row.getValue("last_access_at") as string | null;
          return (
            <span className="text-muted-foreground tabular-nums">
              {lastAccess ? formatBusinessDateOrTimeAgo(lastAccess) : "从未"}
            </span>
          );
        },
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="创建时间" />
        ),
        enableSorting: true,
        meta: { className: "hidden md:table-cell" },
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular-nums">
            {formatBusinessDate(row.getValue("created_at"))}
          </span>
        ),
      },
      {
        id: "actions",
        header: "操作",
        meta: { className: "text-right" },
        enableSorting: false,
        cell: ({ row }) => {
          const user = row.original;
          return (
            <div className="flex justify-end gap-1">
              {hasPermission("users.write") && (
                <UserResetPasswordSheet user={user} />
              )}
              {(currentUser?.is_system_admin ||
                hasPermission("roles.assign")) &&
                !user.is_system_admin && (
                  <UserPermissionSheet user={user} />
                )}
              {hasPermission("users.write") && (
                <UserEditSheet
                  user={user}
                  disabled={user.is_system_admin}
                />
              )}
              {hasPermission("users.delete") && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => void handleDelete(user)}
                  disabled={deletingId === user.id || user.is_system_admin}
                  title="删除"
                  className="hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [
      togglingId,
      deletingId,
      handleToggle,
      handleDelete,
      hasPermission,
      currentUser,
    ],
  );

  return (
    <>
      <DataTable
        key={tableKey}
        columns={columns}
        data={users}
        isLoading={isLoading && users.length === 0}
        isError={isError && users.length === 0}
        error={error}
        emptyMessage={
          q || admin_type ? "未找到匹配的用户" : "暂无用户，点击右上角新建用户"
        }
        emptyIcon={<UsersIcon className="size-8 text-muted-foreground" />}
        emptyHeader={q || admin_type ? undefined : "暂无用户"}
        loadingMessage="加载中..."
        pageSize={pageSize}
        page={page}
        total={total}
        pageCount={pageCount}
        enableRowSelection={hasPermission("users.delete")}
        onSelectionChange={setSelectedUsers}
        isRowSelectable={(user) => !user.is_system_admin}
        sorting={sorting}
        onSortingChange={onSortingChange}
        manualSorting
        headerActions={
          selectedUsers.length > 0 && hasPermission("users.delete") ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => void handleBatchDelete()}
              disabled={isDeletingBatch}
              className="hover:text-destructive"
            >
              <Trash2 className="size-4" />
              删除 {selectedUsers.length} 个用户
            </Button>
          ) : null
        }
      />
      {isError && (
        <div className="text-center">
          <Button variant="link" onClick={onRetry}>
            重试
          </Button>
        </div>
      )}
    </>
  );
}
