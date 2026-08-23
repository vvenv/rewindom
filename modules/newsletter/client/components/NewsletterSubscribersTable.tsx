import { useMemo, useState } from "react";

import {
  ApiError,
  DataTable,
  DataTableColumnHeader,
  usePermissions,
  type DataTableFeatures,
} from "@rewindom/module-sdk/client";
import { formatBusinessDate } from "@rewindom/module-sdk";
import { Badge } from "@rewindom/ui/badge";
import { Button } from "@rewindom/ui/button";
import { Spinner } from "@rewindom/ui/spinner";
import { toast } from "@rewindom/ui/toast";
import { Mail, RotateCcw, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  useDeleteSubscriber,
  useReactivateSubscriber,
} from "../hooks/useNewsletterMutations.js";

import type {
  NewsletterSubscriberListItem,
  SubscriberStatus,
} from "../../shared/index.js";
import type { ColumnDef, SortingState, Updater } from "@tanstack/react-table";
import type { TFunction } from "i18next";

const STATUS_VARIANTS: Record<
  SubscriberStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  confirmed: "default",
  unsubscribed: "outline",
  bounced: "destructive",
  complained: "destructive",
};

function DeleteButton({
  subscriber,
}: {
  subscriber: NewsletterSubscriberListItem;
}) {
  const { t } = useTranslation(["newsletter", "common"]);
  const remove = useDeleteSubscriber();
  const [pending, setPending] = useState(false);

  async function handleDelete(): Promise<void> {
    setPending(true);
    try {
      await remove.mutateAsync(subscriber.id);
      toast.success(t("table.deleted"));
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
      onClick={() => void handleDelete()}
      disabled={pending}
      aria-label={t("table.delete")}
    >
      {pending ? <Spinner className="size-4" /> : <Trash2 className="size-4" />}
    </Button>
  );
}

function ReactivateButton({
  subscriber,
}: {
  subscriber: NewsletterSubscriberListItem;
}) {
  const { t } = useTranslation(["newsletter", "common"]);
  const reactivate = useReactivateSubscriber();
  const [pending, setPending] = useState(false);

  async function handleReactivate(): Promise<void> {
    setPending(true);
    try {
      await reactivate.mutateAsync(subscriber.id);
      toast.success(t("table.reactivated"));
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
      onClick={() => void handleReactivate()}
      disabled={pending}
      aria-label={t("table.reactivate")}
    >
      {pending ? (
        <Spinner className="size-4" />
      ) : (
        <RotateCcw className="size-4" />
      )}
    </Button>
  );
}

function buildColumns(
  t: TFunction,
  canWrite: boolean,
): ColumnDef<DataTableFeatures, NewsletterSubscriberListItem>[] {
  const columns: ColumnDef<DataTableFeatures, NewsletterSubscriberListItem>[] =
    [
      {
        accessorKey: "email",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.email")} />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.getValue("email")}</span>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.status")} />
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const status = row.original.status;
          const reason = row.original.suppressed_reason;
          return (
            <div className="flex flex-col gap-1">
              <Badge variant={STATUS_VARIANTS[status]}>
                {t(`status.${status}`)}
              </Badge>
              {/*
                为什么不再给他发，必须常驻可见——把它藏进详情等于每次排障多点一次
                （与投递记录页把 last_error 摊在状态列旁边同一条口径）。
              */}
              {reason ? (
                <span className="text-destructive text-xs">
                  {t(`suppressed.${reason.split(".").pop()}`)}
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "lists",
        header: t("table.lists"),
        enableSorting: false,
        cell: ({ row }) => {
          const subs = row.original.subscriptions;
          if (subs.length === 0) {
            return (
              <span className="text-muted-foreground">{t("table.none")}</span>
            );
          }
          return (
            <div className="flex flex-wrap gap-1">
              {subs.map((sub) => (
                <Badge
                  key={sub.list_key}
                  variant="outline"
                  className="font-mono"
                >
                  {sub.list_key} · {t(`cadence.${sub.cadence}`)}
                </Badge>
              ))}
            </div>
          );
        },
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("table.created")} />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular-nums">
            {formatBusinessDate(row.getValue("created_at"))}
          </span>
        ),
      },
    ];

  if (canWrite) {
    columns.push({
      id: "actions",
      header: "",
      enableSorting: false,
      meta: { align: "right" },
      cell: ({ row }) => (
        <div className="flex gap-1">
          {/*
            只给退信的地址出恢复按钮。投诉过的不给——把一个刚举报过你的人重新
            加回名单，法律与声誉上都是站长在给自己挖坑；要恢复得手工改库。
            后端同样会拒（409），两处口径一致。
          */}
          {row.original.status === "bounced" ? (
            <ReactivateButton subscriber={row.original} />
          ) : null}
          <DeleteButton subscriber={row.original} />
        </div>
      ),
    });
  }

  return columns;
}

export function NewsletterSubscribersTable({
  subscribers,
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
}: {
  subscribers: NewsletterSubscriberListItem[];
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
}) {
  const { t } = useTranslation(["newsletter", "common"]);
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("newsletter.write");
  const columns = useMemo(() => buildColumns(t, canWrite), [t, canWrite]);

  return (
    <DataTable
      columns={columns}
      data={subscribers}
      // 只有一条都没有时才整页 loading，翻页靠 keepPreviousData 保住上一页
      isLoading={isLoading && subscribers.length === 0}
      isError={isError && subscribers.length === 0}
      error={error}
      emptyIcon={Mail}
      emptyTitle={t("empty.title")}
      emptyDescription={hasFilters ? undefined : t("empty.hint")}
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
