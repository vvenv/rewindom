import { useCallback, useMemo, useState } from "react";

import {
  DataTable,
  DataTableColumnHeader,
  type DataTableFeatures,
} from "@rewindom/client-kit";
import { formatBusinessDate } from "@rewindom/shared";
import { Badge } from "@rewindom/ui/badge";
import { Button } from "@rewindom/ui/button";
import { toast } from "@rewindom/ui/toast";
import { Pencil, ShieldBan, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useDeleteIpRule, type IpRuleScope } from "../hooks/useIpRules.js";

import { IpRuleSheet } from "./IpRuleSheet.js";

import type { IpAccessRuleDto } from "../../shared/index.js";
import type { ColumnDef, SortingState, Updater } from "@tanstack/react-table";
import type { TFunction } from "i18next";

/**
 * `log_only` 要一眼看得出来——它是「看着像在拦，其实没拦」，
 * 排查时最容易被误读成规则失效。
 */
function ModeBadge({ mode, t }: { mode: string; t: TFunction }) {
  return (
    <Badge variant={mode === "enforce" ? "destructive" : "outline"}>
      {t(`mode.${mode}`)}
    </Badge>
  );
}

function ExpiryCell({ value, t }: { value: string | null; t: TFunction }) {
  if (!value) {
    return <span className="text-muted-foreground">{t("table.never")}</span>;
  }
  const expired = new Date(value).getTime() < Date.now();
  return (
    <span
      className={
        expired ? "text-muted-foreground line-through" : "tabular-nums"
      }
    >
      {expired ? t("table.expired") : formatBusinessDate(value)}
    </span>
  );
}

function buildColumns(
  t: TFunction,
  canWrite: boolean,
  onEdit: (rule: IpAccessRuleDto) => void,
  onDelete: (rule: IpAccessRuleDto) => void,
): ColumnDef<DataTableFeatures, IpAccessRuleDto>[] {
  const columns: ColumnDef<DataTableFeatures, IpAccessRuleDto>[] = [
    {
      accessorKey: "cidr",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.cidr")} />
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <span className="font-mono">{row.getValue("cidr")}</span>
      ),
    },
    {
      accessorKey: "action",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.action")} />
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.action === "allow" ? "secondary" : "destructive"
          }
        >
          {t(`action.${row.original.action}`)}
        </Badge>
      ),
    },
    {
      accessorKey: "mode",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.mode")} />
      ),
      enableSorting: true,
      cell: ({ row }) => <ModeBadge mode={row.original.mode} t={t} />,
    },
    {
      accessorKey: "reason",
      header: t("table.reason"),
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.reason}</span>
      ),
    },
    {
      accessorKey: "source",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.source")} />
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {t(`source.${row.original.source}`)}
        </span>
      ),
    },
    {
      accessorKey: "hit_count",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.hits")} />
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.hit_count}</span>
      ),
    },
    {
      accessorKey: "expires_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.expiresAt")} />
      ),
      enableSorting: true,
      cell: ({ row }) => <ExpiryCell value={row.original.expires_at} t={t} />,
    },
  ];

  if (canWrite) {
    columns.push({
      id: "actions",
      header: t("table.actions"),
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("editTitle")}
            onClick={() => onEdit(row.original)}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("delete")}
            onClick={() => onDelete(row.original)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    });
  }

  return columns;
}

export function IpRulesTable({
  scope,
  rules,
  isLoading,
  error,
  page,
  pageSize,
  total,
  pageCount,
  sorting,
  onSortingChange,
  canWrite,
  isFiltered = false,
}: {
  scope: IpRuleScope;
  rules: IpAccessRuleDto[];
  isLoading: boolean;
  error: Error | null;
  page: number;
  pageSize: number;
  total: number;
  pageCount?: number;
  sorting: SortingState;
  onSortingChange: (updater: Updater<SortingState>) => void;
  canWrite: boolean;
  isFiltered?: boolean;
}) {
  const { t } = useTranslation("ip-access");
  const [editing, setEditing] = useState<IpAccessRuleDto | null>(null);
  const deleteMutation = useDeleteIpRule(scope);

  const handleDelete = useCallback(
    (rule: IpAccessRuleDto) => {
      if (!window.confirm(t("deleteConfirm", { cidr: rule.cidr }))) return;
      deleteMutation.mutate(rule.id, {
        onSuccess: () => toast.success(t("toastDeleted")),
        onError: () => toast.error(t("deleteFailed")),
      });
    },
    [t, deleteMutation],
  );

  const columns = useMemo(
    () => buildColumns(t, canWrite, setEditing, handleDelete),
    [t, canWrite, handleDelete],
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={rules}
        isLoading={isLoading}
        isError={Boolean(error)}
        error={error}
        emptyIcon={ShieldBan}
        emptyTitle={isFiltered ? t("emptyFiltered") : t("empty")}
        pageSize={pageSize}
        page={page}
        total={total}
        pageCount={pageCount}
        sorting={sorting}
        onSortingChange={onSortingChange}
      />
      {editing ? (
        <IpRuleSheet
          scope={scope}
          rule={editing}
          open
          onOpenChange={(next) => {
            if (!next) setEditing(null);
          }}
        />
      ) : null}
    </>
  );
}
