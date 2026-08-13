import { useCallback, useMemo, useState } from "react";

import {
  ApiError,
  DataTable,
  DataTableColumnHeader,
  type DataTableFeatures,
  useConfirm,
  usePermissions,
} from "@rewindom/client-kit";
import { formatBusinessDateOrTimeAgo } from "@rewindom/shared";
import { Button } from "@rewindom/ui/button";
import { Switch } from "@rewindom/ui/switch";
import { toast } from "@rewindom/ui/toast";
import { Key, Trash2, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  useDeleteSiteMember,
  useResetSiteMemberPassword,
  useUpdateSiteMember,
} from "../hooks/use-site-members.js";

import type { SiteMemberListItem } from "../../shared/site-member.js";
import type { ColumnDef, SortingState, Updater } from "@tanstack/react-table";

interface SiteMembersTableProps {
  members: SiteMemberListItem[];
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

export function SiteMembersTable({
  members,
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
}: SiteMembersTableProps) {
  const { t } = useTranslation(["site-member", "common"]);
  const { confirm } = useConfirm();
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("site_members.write");
  const updateMutation = useUpdateSiteMember();
  const resetMutation = useResetSiteMemberPassword();
  const deleteMutation = useDeleteSiteMember();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleToggle = useCallback(
    async (member: SiteMemberListItem, enabled: boolean) => {
      setTogglingId(member.id);
      try {
        await updateMutation.mutateAsync({ id: member.id, enabled });
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : t("common:updateFailed"),
        );
      } finally {
        setTogglingId(null);
      }
    },
    [t, updateMutation],
  );

  const handleReset = useCallback(
    async (member: SiteMemberListItem) => {
      const confirmed = await confirm({
        title: t("admin.resetConfirmTitle"),
        description: t("admin.resetConfirmDescription", {
          email: member.email,
        }),
      });
      if (!confirmed) return;
      try {
        const result = await resetMutation.mutateAsync(member.id);
        await navigator.clipboard.writeText(result.password);
        toast.success(t("admin.resetSuccess"));
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : t("errors.generic"),
        );
      }
    },
    [confirm, resetMutation, t],
  );

  const handleDelete = useCallback(
    async (member: SiteMemberListItem) => {
      const confirmed = await confirm({
        title: t("admin.deleteConfirmTitle"),
        description: t("admin.deleteConfirmDescription", {
          email: member.email,
        }),
        destructive: true,
      });
      if (!confirmed) return;
      try {
        await deleteMutation.mutateAsync(member.id);
        toast.success(t("admin.deleteSuccess"));
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : t("errors.generic"),
        );
      }
    },
    [confirm, deleteMutation, t],
  );

  const columns = useMemo<ColumnDef<DataTableFeatures, SiteMemberListItem>[]>(
    () => [
      {
        accessorKey: "email",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("fields.email")} />
        ),
      },
      {
        accessorKey: "display_name",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("fields.display_name")}
          />
        ),
      },
      {
        accessorKey: "enabled",
        enableSorting: false,
        header: t("admin.enabled"),
        cell: ({ row }) => (
          <Switch
            checked={row.original.enabled}
            disabled={!canWrite || togglingId === row.original.id}
            onCheckedChange={(checked) =>
              void handleToggle(row.original, checked)
            }
          />
        ),
      },
      {
        accessorKey: "last_login_at",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("account.last_login_at")}
          />
        ),
        cell: ({ row }) =>
          row.original.last_login_at
            ? formatBusinessDateOrTimeAgo(row.original.last_login_at)
            : t("account.never"),
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("account.created_at")}
          />
        ),
        cell: ({ row }) => formatBusinessDateOrTimeAgo(row.original.created_at),
      },
      ...(canWrite
        ? [
            {
              id: "actions",
              enableSorting: false,
              header: t("admin.actions"),
              meta: { align: "right" as const },
              cell: ({ row }: { row: { original: SiteMemberListItem } }) => (
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    title={t("admin.resetPassword")}
                    onClick={() => void handleReset(row.original)}
                  >
                    <Key className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    title={t("common:delete")}
                    className="hover:text-destructive"
                    onClick={() => void handleDelete(row.original)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ),
            } satisfies ColumnDef<DataTableFeatures, SiteMemberListItem>,
          ]
        : []),
    ],
    [canWrite, handleDelete, handleReset, handleToggle, t, togglingId],
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={members}
        isLoading={isLoading && members.length === 0}
        isError={isError && members.length === 0}
        error={error}
        emptyIcon={Users}
        emptyTitle={q ? t("admin.emptyFiltered") : t("admin.empty")}
        emptyDescription={
          q ? t("admin.emptyFilteredHint") : t("admin.emptyHint")
        }
        loadingMessage={t("common:loading")}
        pageSize={pageSize}
        page={page}
        total={total}
        pageCount={pageCount}
        sorting={sorting}
        onSortingChange={onSortingChange}
        manualSorting
      />
      {isError ? (
        <div className="text-center">
          <Button variant="link" onClick={onRetry}>
            {t("common:retry")}
          </Button>
        </div>
      ) : null}
    </>
  );
}
