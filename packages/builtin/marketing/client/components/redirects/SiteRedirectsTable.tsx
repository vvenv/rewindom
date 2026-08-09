import { useCallback, useMemo, type ReactElement } from "react";

import {
  DataTable,
  type DataTableFeatures,
  useConfirm,
} from "@be-water/client-kit";
import { Badge } from "@be-water/ui/badge";
import { Button } from "@be-water/ui/button";
import { toast } from "@be-water/ui/toast";
import { Plus, Signpost, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useDeleteSiteRedirect } from "../../hooks/useSiteRedirects.js";

import { SiteRedirectCreateSheet } from "./SiteRedirectCreateSheet.js";


import type { SiteRedirect } from "../../../shared/site-redirect.js";
import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";

function RedirectRowActions({
  redirect,
}: {
  redirect: SiteRedirect;
}): ReactElement {
  const { t } = useTranslation("marketing");
  const { confirm } = useConfirm();
  const remove = useDeleteSiteRedirect();

  const handleDelete = useCallback(async () => {
    const confirmed = await confirm({
      title: t("redirects.deleteConfirmTitle"),
      description: t("redirects.deleteConfirmDescription", {
        from_path: redirect.from_path,
      }),
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await remove.mutateAsync(redirect.id);
      toast.success(t("redirects.deleted"));
    } catch {
      toast.error(t("redirects.deleteFailed"));
    }
  }, [confirm, redirect, remove, t]);

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={t("redirects.delete")}
      disabled={remove.isPending}
      onClick={() => void handleDelete()}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}

function buildColumns(
  t: TFunction,
  canWrite: boolean,
): ColumnDef<DataTableFeatures, SiteRedirect>[] {
  return [
    {
      accessorKey: "from_path",
      header: t("redirects.from"),
      enableSorting: false,
      meta: { cellClassName: "font-mono" },
    },
    {
      accessorKey: "to_path",
      header: t("redirects.to"),
      enableSorting: false,
      meta: { cellClassName: "font-mono text-muted-foreground" },
    },
    {
      accessorKey: "status_code",
      header: t("redirects.type"),
      enableSorting: false,
      cell: ({ row }) => (
        <Badge
          variant={row.original.status_code === 301 ? "default" : "outline"}
        >
          {row.original.status_code === 301
            ? t("redirects.permanentShort")
            : t("redirects.temporaryShort")}
        </Badge>
      ),
    },
    ...(canWrite
      ? ([
          {
            id: "actions",
            header: "",
            enableSorting: false,
            meta: { align: "right" },
            cell: ({ row }) => <RedirectRowActions redirect={row.original} />,
          },
        ] satisfies ColumnDef<DataTableFeatures, SiteRedirect>[])
      : []),
  ];
}

export function SiteRedirectsTable({
  redirects,
  isLoading,
  error,
  canWrite,
}: {
  redirects: SiteRedirect[];
  isLoading: boolean;
  error: Error | null;
  canWrite: boolean;
}): ReactElement {
  const { t } = useTranslation("marketing");
  const columns = useMemo(() => buildColumns(t, canWrite), [t, canWrite]);

  return (
    <DataTable
      columns={columns}
      data={redirects}
      isLoading={isLoading && redirects.length === 0}
      isError={Boolean(error) && redirects.length === 0}
      error={error}
      emptyIcon={Signpost}
      emptyTitle={t("redirects.empty")}
      emptyDescription={t("redirects.emptyHint")}
      emptyAction={
        canWrite ? (
          <SiteRedirectCreateSheet>
            <Button size="sm">
              <Plus className="size-4" />
              {t("redirects.create")}
            </Button>
          </SiteRedirectCreateSheet>
        ) : null
      }
      loadingMessage={t("redirects.loading")}
      manualSorting={false}
    />
  );
}
