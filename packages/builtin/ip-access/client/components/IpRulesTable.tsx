import { useCallback, useMemo } from "react";

import {
  DataTable,
  DataTableColumnHeader,
  type DataTableFeatures,
  useConfirm,
} from "@rewindom/client-kit";
import {
  displayOrEmpty,
  EMPTY_DISPLAY,
  formatBusinessDate,
  formatBusinessDateOrTimeAgo,
} from "@rewindom/shared";
import { Badge } from "@rewindom/ui/badge";
import { Button } from "@rewindom/ui/button";
import { toast } from "@rewindom/ui/toast";
import { ShieldBan, Trash2 } from "lucide-react";
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
  scope: IpRuleScope,
  canWrite: boolean,
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
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-muted-foreground line-clamp-2 max-w-xs">
          {displayOrEmpty(row.original.reason)}
        </span>
      ),
    },
    {
      accessorKey: "source",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.source")} />
      ),
      enableSorting: true,
      meta: {
        headerClassName: "hidden md:table-cell",
        cellClassName: "hidden md:table-cell",
      },
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
      accessorKey: "last_hit_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.lastHit")} />
      ),
      enableSorting: true,
      meta: {
        headerClassName: "hidden lg:table-cell",
        cellClassName: "hidden lg:table-cell",
      },
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular-nums">
          {row.original.last_hit_at
            ? formatBusinessDateOrTimeAgo(row.original.last_hit_at)
            : EMPTY_DISPLAY}
        </span>
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
      enableSorting: false,
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="flex gap-1">
          <IpRuleSheet scope={scope} rule={row.original} />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("delete")}
            className="hover:text-destructive"
            onClick={() => onDelete(row.original)}
          >
            <Trash2 className="size-3.5" />
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
  const { confirm } = useConfirm();
  const deleteMutation = useDeleteIpRule(scope);

  const handleDelete = useCallback(
    async (rule: IpAccessRuleDto) => {
      const ok = await confirm({
        title: t("deleteConfirmTitle"),
        description: t("deleteConfirm", { cidr: rule.cidr }),
        confirmText: t("delete"),
        destructive: true,
      });
      if (!ok) return;
      deleteMutation.mutate(rule.id, {
        onSuccess: () => toast.success(t("toastDeleted")),
        onError: () => toast.error(t("deleteFailed")),
      });
    },
    [t, confirm, deleteMutation],
  );

  const columns = useMemo(
    () => buildColumns(t, scope, canWrite, (rule) => void handleDelete(rule)),
    [t, scope, canWrite, handleDelete],
  );

  return (
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
  );
}
