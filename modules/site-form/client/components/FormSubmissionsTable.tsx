import { useMemo } from "react";

import {
  DataTable,
  formatBusinessDate,
  type DataTableFeatures,
} from "@rewindom/module-sdk/client";
import { Inbox } from "lucide-react";
import { useTranslation } from "react-i18next";

import { submissionSource, summarizeEntries } from "../lib/form-submissions.js";

import { FormSubmissionRowActions } from "./FormSubmissionRowActions.js";

import type { FormSubmissionListItem } from "../hooks/useFormSubmissions.js";
import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";

/**
 * 列固定不了：字段由站长自己定义，每个表单都不一样。所以只固定「时间 / 来源」两列，
 * 内容压成一行摘要——硬凑几列的结果是大半内容落进「其它」，反而更难读。
 */
function buildColumns(
  t: TFunction,
  canWrite: boolean,
): ColumnDef<DataTableFeatures, FormSubmissionListItem>[] {
  return [
    {
      accessorKey: "created_at",
      header: t("formSubmissions.table.time"),
      enableSorting: false,
      meta: { cellClassName: "text-muted-foreground tabular-nums" },
      cell: ({ row }) => formatBusinessDate(row.getValue("created_at")),
    },
    {
      id: "source",
      accessorFn: (row) => submissionSource(row),
      header: t("formSubmissions.table.source"),
      enableSorting: false,
      meta: { cellClassName: "font-medium" },
    },
    {
      id: "content",
      accessorFn: (row) => summarizeEntries(row.data),
      header: t("formSubmissions.table.content"),
      enableSorting: false,
      meta: { cellClassName: "whitespace-break-spaces text-muted-foreground" },
    },
    ...(canWrite
      ? ([
          {
            id: "actions",
            header: "",
            enableSorting: false,
            meta: { align: "right" },
            cell: ({ row }) => (
              <FormSubmissionRowActions submission={row.original} />
            ),
          },
        ] satisfies ColumnDef<DataTableFeatures, FormSubmissionListItem>[])
      : []),
  ];
}

export function FormSubmissionsTable({
  submissions,
  isLoading,
  error,
  page,
  pageSize,
  total,
  pageCount,
  canWrite,
}: {
  submissions: FormSubmissionListItem[];
  isLoading: boolean;
  error: Error | null;
  page: number;
  pageSize: number;
  total: number;
  pageCount?: number;
  canWrite: boolean;
}) {
  const { t } = useTranslation("site-form");
  const columns = useMemo(() => buildColumns(t, canWrite), [t, canWrite]);

  return (
    <DataTable
      columns={columns}
      data={submissions}
      isLoading={isLoading && submissions.length === 0}
      isError={Boolean(error) && submissions.length === 0}
      error={error}
      emptyIcon={Inbox}
      emptyTitle={t("formSubmissions.empty")}
      emptyDescription={t("formSubmissions.emptyHint")}
      loadingMessage={t("formSubmissions.loading")}
      pageSize={pageSize}
      page={page}
      total={total}
      pageCount={pageCount}
    />
  );
}
