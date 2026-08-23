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
import { Mail, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useDeleteSubscriber } from "../hooks/useNewsletterMutations.js";

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
          return (
            <Badge variant={STATUS_VARIANTS[status]}>
              {t(`status.${status}`)}
            </Badge>
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
