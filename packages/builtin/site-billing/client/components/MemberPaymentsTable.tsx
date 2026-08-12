import { useMemo } from "react";

import {
  DataTable,
  DataTableColumnHeader,
  type DataTableFeatures,
} from "@be-water/client-kit";
import { Badge } from "@be-water/ui/badge";
import { Receipt } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  formatPlanPrice,
  formatSiteBillingDate,
} from "../lib/site-billing-format.js";

import type { MemberPaymentSummary } from "../../shared/site-billing.js";
import type { ColumnDef, SortingState, Updater } from "@tanstack/react-table";

export function MemberPaymentsTable({
  payments,
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
  payments: MemberPaymentSummary[];
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

  const columns = useMemo<ColumnDef<DataTableFeatures, MemberPaymentSummary>[]>(
    () => [
      {
        id: "member",
        header: t("payments.member"),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.member_email ?? row.original.member_id}
          </span>
        ),
      },
      {
        accessorKey: "paid_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("payments.time")} />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular-nums">
            {formatSiteBillingDate(
              row.original.paid_at ?? row.original.created_at,
            )}
          </span>
        ),
      },
      {
        id: "plan",
        header: t("payments.plan"),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-xs">
            {row.original.plan_slug ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "amount_cents",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("payments.amount")} />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatPlanPrice(row.original.amount_cents, row.original.currency)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("payments.status")} />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.status === "paid"
                ? "default"
                : row.original.status === "failed"
                  ? "destructive"
                  : "outline"
            }
          >
            {t(`paymentStatus.${row.original.status}`)}
          </Badge>
        ),
      },
    ],
    [t],
  );

  return (
    <DataTable
      columns={columns}
      data={payments}
      isLoading={isLoading && payments.length === 0}
      isError={isError && payments.length === 0}
      error={error}
      emptyIcon={Receipt}
      emptyTitle={isFiltered ? t("payments.emptyFiltered") : t("payments.empty")}
      emptyDescription={
        isFiltered ? t("payments.emptyFilteredHint") : t("payments.emptyHint")
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
