import { useMemo, useState } from "react";

import {
  ApiError,
  DataTable,
  DataTableColumnHeader,
  useConfirm,
  type DataTableFeatures,
} from "@be-water/client-kit";
import { Badge } from "@be-water/ui/badge";
import { Button } from "@be-water/ui/button";
import { toast } from "@be-water/ui/toast";
import { Package, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useDeleteMemberPlan } from "../hooks/useSiteBillingMutations.js";
import {
  formatPlanPrice,
  memberPlanDisplayName,
} from "../lib/site-billing-format.js";

import { MemberPlanEditSheet } from "./MemberPlanSheet.js";

import type { MemberPlanDetail } from "../../shared/site-billing.js";
import type { ColumnDef, SortingState } from "@tanstack/react-table";

export function MemberPlansTable({
  plans,
  isLoading,
  isError,
  error,
  canWrite,
}: {
  plans: MemberPlanDetail[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  canWrite: boolean;
}) {
  const { t, i18n } = useTranslation(["site-billing", "common"]);
  const { confirm } = useConfirm();
  const deletePlan = useDeleteMemberPlan();
  // 全量表（套餐一档一行，没有分页），排序在客户端做
  const [sorting, setSorting] = useState<SortingState>([]);
  const locale = i18n.language;

  const columns = useMemo<ColumnDef<DataTableFeatures, MemberPlanDetail>[]>(() => {
    const handleDelete = async (plan: MemberPlanDetail) => {
      const ok = await confirm({
        title: t("plans.delete"),
        description: t("plans.deleteConfirm", {
          name: memberPlanDisplayName(plan, locale),
        }),
        confirmText: t("common:delete"),
        destructive: true,
      });
      if (!ok) return;

      try {
        await deletePlan.mutateAsync(plan.id);
        toast.success(t("plans.deleted"));
      } catch (err) {
        // 「还有人在订」就是走这条：服务端已经把原因翻好了，别覆盖成一句泛化的失败
        toast.error(
          err instanceof ApiError || err instanceof Error
            ? err.message
            : t("common:requestFailed"),
        );
      }
    };

    return [
      {
        id: "name",
        accessorFn: (plan) => memberPlanDisplayName(plan, locale),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("plans.name")} />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <span className="font-medium">
            {memberPlanDisplayName(row.original, locale)}
          </span>
        ),
      },
      {
        accessorKey: "slug",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("plans.slug")} />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-xs">
            {row.original.slug}
          </span>
        ),
      },
      {
        accessorKey: "price_cents",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("plans.price")} />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatPlanPrice(row.original.price_cents, row.original.currency)}
          </span>
        ),
      },
      {
        accessorKey: "interval",
        header: t("plans.interval"),
        enableSorting: false,
        cell: ({ row }) => t(`interval.${row.original.interval}`),
      },
      {
        accessorKey: "sort_order",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("plans.sortOrder")} />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.sort_order}</span>
        ),
      },
      {
        id: "enabled",
        header: t("plans.enabled"),
        enableSorting: false,
        cell: ({ row }) => {
          const plan = row.original;
          // 「上架」与「买得到」是两件事：没配商品 ID 的那一档即使上架了，
          // 官网上也不会出现——把这一条直接标出来，省得站长对着空定价页排查。
          if (!plan.enabled) return <Badge variant="outline">{t("common:no")}</Badge>;
          if (!plan.purchasable) {
            return <Badge variant="destructive">{t("plans.notPurchasable")}</Badge>;
          }
          return <Badge>{t("common:yes")}</Badge>;
        },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        meta: { align: "right" },
        cell: ({ row }) =>
          canWrite ? (
            <div className="flex gap-1">
              <MemberPlanEditSheet plan={row.original} />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                title={t("plans.delete")}
                disabled={deletePlan.isPending}
                onClick={() => void handleDelete(row.original)}
              >
                <Trash2 />
              </Button>
            </div>
          ) : null,
      },
    ];
  }, [canWrite, confirm, deletePlan, locale, t]);

  return (
    <DataTable
      columns={columns}
      data={plans}
      isLoading={isLoading}
      isError={isError}
      error={error}
      emptyIcon={Package}
      emptyTitle={t("plans.empty")}
      emptyDescription={t("plans.emptyHint")}
      sorting={sorting}
      onSortingChange={setSorting}
      manualSorting={false}
    />
  );
}
