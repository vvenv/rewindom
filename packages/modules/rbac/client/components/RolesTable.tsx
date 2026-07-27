import { useMemo, useState } from "react";

import {
  ApiError,
  DataTable,
  DataTableColumnHeader,
  useConfirm,
  usePermissions,
} from "@be-water/client-kit";
import { Badge } from "@be-water/ui/badge";
import { Button } from "@be-water/ui/button";
import { toast } from "@be-water/ui/toast";
import { ShieldCheck, Trash2 } from "lucide-react";

import { useDeleteRole } from "../hooks/useRoleMutations.js";

import { RoleEditSheet } from "./RoleSheet.js";

import type { RoleDetail } from "@be-water/shared";
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
  const [sorting, setSorting] = useState<SortingState>([]);
  const { hasPermission } = usePermissions();
  const { confirm } = useConfirm();
  const deleteMutation = useDeleteRole();

  const canWrite = hasPermission("roles.write");

  const columns = useMemo<ColumnDef<RoleDetail>[]>(() => {
    const handleDelete = async (role: RoleDetail) => {
      const ok = await confirm({
        title: "删除角色",
        description: `确定删除角色「${role.name}」？该角色下成员将失去由它带来的权限。`,
        confirmText: "删除",
        destructive: true,
      });
      if (!ok) return;

      try {
        await deleteMutation.mutateAsync(role.id);
        toast.success("角色已删除");
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : "删除失败，请重试",
        );
      }
    };

    return [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="角色" />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.original.name}</span>
            {row.original.is_builtin && <Badge variant="secondary">内置</Badge>}
          </div>
        ),
      },
      {
        accessorKey: "description",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="描述" />
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
        header: "权限数",
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
              {/* 内置角色服务端禁止删除，这里直接不给入口 */}
              {!row.original.is_builtin && (
                <Button
                  variant="ghost"
                  size="sm"
                  title="删除角色"
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
  }, [canWrite, confirm, deleteMutation]);

  return (
    <DataTable
      columns={columns}
      data={roles}
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={onRetry}
      emptyIcon={<ShieldCheck />}
      emptyHeader="暂无角色"
      emptyMessage="创建角色后，即可为成员分配对应权限"
      sorting={sorting}
      onSortingChange={setSorting}
      manualSorting={false}
    />
  );
}
