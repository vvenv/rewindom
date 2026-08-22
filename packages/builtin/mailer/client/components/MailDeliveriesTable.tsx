import { useMemo, useState } from "react";

import {
  ApiError,
  DataTable,
  DataTableColumnHeader,
  usePermissions,
  type DataTableFeatures,
} from "@rewindom/client-kit";
import { formatBusinessDate } from "@rewindom/shared";
import { Badge } from "@rewindom/ui/badge";
import { Button } from "@rewindom/ui/button";
import { Spinner } from "@rewindom/ui/spinner";
import { toast } from "@rewindom/ui/toast";
import { RotateCw, Send } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useRetryDelivery } from "../hooks/useMailerMutations.js";

import type {
  MailDeliveryListItem,
  MailDeliveryStatus,
} from "../../shared/index.js";
import type { ColumnDef, SortingState, Updater } from "@tanstack/react-table";
import type { TFunction } from "i18next";

const STATUS_VARIANTS: Record<
  MailDeliveryStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  queued: "secondary",
  sent: "default",
  failed: "destructive",
  dropped: "outline",
};

interface MailDeliveriesTableProps {
  deliveries: MailDeliveryListItem[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  sorting: SortingState;
  onSortingChange: (updater: Updater<SortingState>) => void;
  hasFilters: boolean;
}

function RetryButton({ delivery }: { delivery: MailDeliveryListItem }) {
  const { t } = useTranslation(["mailer", "common"]);
  const retry = useRetryDelivery();
  const [pending, setPending] = useState(false);

  async function handleRetry(): Promise<void> {
    setPending(true);
    try {
      await retry.mutateAsync(delivery.id);
      toast.success(t("table.retried"));
    } catch (err) {
      toast.error(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : t("common:saveFailed"),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => void handleRetry()}
      disabled={pending}
    >
      {pending ? <Spinner className="size-4" /> : <RotateCw className="size-4" />}
      <span className="sr-only">{t("table.retry")}</span>
    </Button>
  );
}

function buildColumns(
  t: TFunction,
  canWrite: boolean,
): ColumnDef<DataTableFeatures, MailDeliveryListItem>[] {
  const columns: ColumnDef<DataTableFeatures, MailDeliveryListItem>[] = [
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.time")} />
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular-nums">
          {formatBusinessDate(row.getValue("created_at"))}
        </span>
      ),
    },
    {
      accessorKey: "to_email",
      header: t("table.to"),
      enableSorting: false,
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.getValue("to_email")}</span>
      ),
    },
    {
      accessorKey: "subject",
      header: t("table.subject"),
      enableSorting: false,
      cell: ({ row }) => <span>{row.getValue("subject")}</span>,
    },
    {
      accessorKey: "source",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.source")} />
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {row.getValue("source")}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.status")} />
      ),
      enableSorting: true,
      cell: ({ row }) => {
        const delivery = row.original;
        const status = delivery.status;
        return (
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-1">
              <Badge variant={STATUS_VARIANTS[status]}>
                {t(`deliveryStatus.${status}`)}
              </Badge>
              {/*
                log driver 的「已发出」是假象：它只把全文写进日志就成功返回。
                不在这里说破，开发者会拿着一条绿色的「已发出」去查收件箱——
                这正是本模块第一次真实使用时踩到的坑。
              */}
              {delivery.driver === "log" ? (
                <Badge variant="destructive">{t("table.notReallySent")}</Badge>
              ) : null}
            </div>
            {/*
              失败原因必须常驻可见：投递记录页存在的理由就是回答「为什么没收到」，
              把它藏进详情等于每次排障多点一次。
            */}
            {delivery.last_error ? (
              <span className="text-destructive text-xs">
                {delivery.last_error}
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      accessorKey: "driver",
      header: t("table.driver"),
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          {row.getValue("driver")}
        </span>
      ),
    },
    {
      accessorKey: "attempt_count",
      header: t("table.attempts"),
      enableSorting: false,
      cell: ({ row }) => (
        <span className="tabular-nums">{row.getValue("attempt_count")}</span>
      ),
    },
  ];

  if (canWrite) {
    columns.push({
      id: "actions",
      header: "",
      enableSorting: false,
      meta: { align: "right" },
      cell: ({ row }) =>
        // 已发出的不给重试按钮：那只会制造重复投递
        row.original.status === "sent" ? null : (
          <div className="flex gap-1">
            <RetryButton delivery={row.original} />
          </div>
        ),
    });
  }

  return columns;
}

export function MailDeliveriesTable({
  deliveries,
  isLoading,
  isError,
  error,
  page,
  pageSize,
  total,
  pageCount,
  sorting,
  onSortingChange,
  hasFilters,
}: MailDeliveriesTableProps) {
  const { t } = useTranslation(["mailer", "common"]);
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("mailer.write");
  const columns = useMemo(() => buildColumns(t, canWrite), [t, canWrite]);

  return (
    <DataTable
      columns={columns}
      data={deliveries}
      // 只有一条都没有时才整页 loading，翻页时靠 keepPreviousData 保住上一页
      isLoading={isLoading && deliveries.length === 0}
      isError={isError && deliveries.length === 0}
      error={error}
      emptyIcon={Send}
      emptyTitle={t("empty.title")}
      loadingMessage={t("common:loading")}
      page={page}
      pageSize={pageSize}
      total={total}
      pageCount={pageCount}
      sorting={sorting}
      onSortingChange={onSortingChange}
      manualSorting
      key={hasFilters ? "filtered" : "all"}
    />
  );
}
