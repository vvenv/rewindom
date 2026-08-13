import { useMemo } from "react";

import {
  DataTable,
  DataTableColumnHeader,
  type DataTableFeatures,
} from "@rewindom/client-kit";
import { Badge } from "@rewindom/ui/badge";
import { Users } from "lucide-react";
import { useTranslation } from "react-i18next";

import { formatSiteBillingDate } from "../lib/site-billing-format.js";

import type { MemberSubscriptionSummary } from "../../shared/site-billing.js";
import type { ColumnDef, SortingState, Updater } from "@tanstack/react-table";

export function MemberSubscriptionsTable({
  subscriptions,
  isLoading,
  isError,
  error,
  page,
  pageSize,
  total,
  pageCount,
  isFiltered,
  sorting,
  onSortingChange,
}: {
  subscriptions: MemberSubscriptionSummary[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  page: number;
  pageSize: number;
  total: number;
  pageCount?: number;
  isFiltered: boolean;
  sorting: SortingState;
  onSortingChange: (updater: Updater<SortingState>) => void;
}) {
  const { t } = useTranslation(["site-billing", "common"]);

  const columns = useMemo<
    ColumnDef<DataTableFeatures, MemberSubscriptionSummary>[]
  >(
    () => [
      {
        id: "member",
        header: t("subscriptions.member"),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.member_email ?? row.original.member_id}
          </span>
        ),
      },
      {
        accessorKey: "plan_slug",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("subscriptions.plan")} />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-xs">
            {row.original.plan_slug}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("subscriptions.status")}
          />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <Badge variant="outline">{t(`status.${row.original.status}`)}</Badge>
        ),
      },
      {
        id: "period_end",
        header: t("subscriptions.periodEnd"),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular-nums">
            {formatSiteBillingDate(row.original.current_period_end)}
          </span>
        ),
      },
      {
        id: "cancel_at_period_end",
        header: t("subscriptions.cancelAtPeriodEnd"),
        enableSorting: false,
        cell: ({ row }) =>
          row.original.cancel_at_period_end ? (
            <Badge variant="destructive">{t("common:yes")}</Badge>
          ) : (
            <span className="text-muted-foreground">{t("common:no")}</span>
          ),
      },
      {
        accessorKey: "updated_at",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("subscriptions.updatedAt")}
          />
        ),
        enableSorting: true,
        meta: { className: "hidden md:table-cell" },
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular-nums">
            {formatSiteBillingDate(row.original.updated_at)}
          </span>
        ),
      },
    ],
    [t],
  );

  return (
    <DataTable
      columns={columns}
      data={subscriptions}
      isLoading={isLoading && subscriptions.length === 0}
      isError={isError && subscriptions.length === 0}
      error={error}
      emptyIcon={Users}
      emptyTitle={
        isFiltered ? t("subscriptions.emptyFiltered") : t("subscriptions.empty")
      }
      emptyDescription={
        isFiltered
          ? t("subscriptions.emptyFilteredHint")
          : t("subscriptions.emptyHint")
      }
      loadingMessage={t("common:loading")}
      page={page}
      pageSize={pageSize}
      total={total}
      pageCount={pageCount}
      sorting={sorting}
      onSortingChange={onSortingChange}
      manualSorting
    />
  );
}
