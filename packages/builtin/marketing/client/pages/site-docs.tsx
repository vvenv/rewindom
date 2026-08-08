import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";

import {
  ApiError,
  DataTable,
  PageLayout,
  useConfirm,
  usePermissions,
  type DataTableFeatures,
} from "@be-water/client-kit";
import { Badge } from "@be-water/ui/badge";
import { Button } from "@be-water/ui/button";
import { DraggableFabTrigger } from "@be-water/ui/draggable-fab";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@be-water/ui/dropdown-menu";
import { toast } from "@be-water/ui/toast";
import {
  Download,
  FileText,
  MoreVertical,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  Trash2,
  Upload,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { SiteDocEditorSheet } from "../components/SiteDocEditorSheet.js";
import {
  useDeleteSiteDoc,
  useExportAllSiteDocs,
  useExportSiteDoc,
  useImportSiteDocs,
  usePublishSiteDoc,
  useRevertSiteDoc,
  useSiteDocs,
  useUnpublishSiteDoc,
} from "../hooks/useSiteDocs.js";

import type { MarketingDocListItem } from "../../shared/marketing-doc.js";
import type { ColumnDef } from "@tanstack/react-table";
import type { TFunction } from "i18next";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

function DocRowActions({
  doc,
  canWrite,
  onEdit,
}: {
  doc: MarketingDocListItem;
  canWrite: boolean;
  onEdit: (doc: MarketingDocListItem) => void;
}): ReactElement {
  const { t } = useTranslation("marketing");
  const { confirm } = useConfirm();
  const remove = useDeleteSiteDoc();
  const publish = usePublishSiteDoc();
  const unpublish = useUnpublishSiteDoc();
  const revert = useRevertSiteDoc();
  const exportDoc = useExportSiteDoc();

  const handleDelete = useCallback(async () => {
    const confirmed = await confirm({
      title: t("siteDocs.deleteConfirmTitle"),
      description: t("siteDocs.deleteConfirmDescription", {
        title: doc.title,
      }),
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await remove.mutateAsync(doc.id);
      toast.success(t("siteDocs.deleted"));
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : t("siteDocs.deleteFailed"),
      );
    }
  }, [confirm, doc, remove, t]);

  const handlePublish = useCallback(async () => {
    try {
      await publish.mutateAsync(doc.id);
      toast.success(t("siteDocs.publishedToast"));
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : t("siteDocs.publishFailed"),
      );
    }
  }, [publish, doc.id, t]);

  const handleUnpublish = useCallback(async () => {
    try {
      await unpublish.mutateAsync(doc.id);
      toast.success(t("siteDocs.unpublishedToast"));
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : t("siteDocs.unpublishFailed"),
      );
    }
  }, [unpublish, doc.id, t]);

  const handleRevert = useCallback(async () => {
    const confirmed = await confirm({
      title: t("siteDocs.revertConfirmTitle"),
      description: t("siteDocs.revertConfirmDescription"),
    });
    if (!confirmed) return;
    try {
      await revert.mutateAsync(doc.id);
      toast.success(t("siteDocs.reverted"));
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : t("siteDocs.revertFailed"),
      );
    }
  }, [confirm, revert, doc.id, t]);

  const handleExport = useCallback(async () => {
    try {
      const result = await exportDoc.mutateAsync(doc.id);
      downloadBlob(result.filename, result.markdown);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : t("siteDocs.exportFailed"),
      );
    }
  }, [exportDoc, doc.id, t]);

  if (!canWrite) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("siteDocs.export")}
        disabled={exportDoc.isPending}
        onClick={() => void handleExport()}
      >
        <Download className="size-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("siteDocs.actions")}>
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onEdit(doc)}>
          <Pencil className="size-4" />
          {t("siteDocs.edit")}
        </DropdownMenuItem>
        {doc.status === "published" ? (
          <DropdownMenuItem onSelect={() => void handleUnpublish()}>
            <Send className="size-4" />
            {t("siteDocs.unpublish")}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => void handlePublish()}>
            <Send className="size-4" />
            {t("siteDocs.publish")}
          </DropdownMenuItem>
        )}
        {doc.content_dirty && (
          <DropdownMenuItem onSelect={() => void handleRevert()}>
            <RotateCcw className="size-4" />
            {t("siteDocs.revert")}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => void handleExport()}>
          <Download className="size-4" />
          {t("siteDocs.export")}
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => void handleDelete()}
        >
          <Trash2 className="size-4" />
          {t("siteDocs.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function buildColumns(
  t: TFunction,
  canWrite: boolean,
  onEdit: (doc: MarketingDocListItem) => void,
): ColumnDef<DataTableFeatures, MarketingDocListItem>[] {
  return [
    {
      accessorKey: "title",
      header: t("siteDocs.title"),
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{row.original.title}</span>
          {row.original.description && (
            <span className="text-muted-foreground text-xs">
              {row.original.description}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "slug",
      header: t("siteDocs.slug"),
      enableSorting: false,
      cell: ({ row }) => (
        <a
          href={`/docs/${row.original.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-muted-foreground hover:underline"
        >
          /docs/{row.original.slug}
        </a>
      ),
    },
    {
      accessorKey: "category",
      header: t("siteDocs.category"),
      enableSorting: false,
      cell: ({ row }) =>
        row.original.category ? (
          <Badge variant="outline">{row.original.category}</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "status",
      header: t("siteDocs.status"),
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Badge
            variant={
              row.original.status === "published" ? "default" : "outline"
            }
          >
            {row.original.status === "published"
              ? t("siteDocs.published")
              : t("siteDocs.draft")}
          </Badge>
          {row.original.content_dirty && (
            <Badge variant="secondary">{t("siteDocs.dirty")}</Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: "updated_at",
      header: t("siteDocs.updated"),
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDate(row.original.updated_at)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      meta: { align: "right" },
      cell: ({ row }) => (
        <DocRowActions doc={row.original} canWrite={canWrite} onEdit={onEdit} />
      ),
    },
  ];
}

function downloadBlob(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 1000);
}

export function SiteDocs(): ReactElement {
  const { t } = useTranslation("marketing");
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("site.write");
  const { data, isLoading, error } = useSiteDocs();
  const docs: MarketingDocListItem[] = data ?? [];
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<MarketingDocListItem | null>(
    null,
  );

  const importDocs = useImportSiteDocs();
  const exportAll = useExportAllSiteDocs();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openCreate = useCallback(() => {
    setEditingDoc(null);
    setEditorOpen(true);
  }, []);

  const openEdit = useCallback((doc: MarketingDocListItem) => {
    setEditingDoc(doc);
    setEditorOpen(true);
  }, []);

  const handleImport = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;
      try {
        const result = await importDocs.mutateAsync(Array.from(files));
        const created = result.imported.filter((r) => r.created).length;
        const updated = result.imported.length - created;
        toast.success(t("siteDocs.importResult", { created, updated }));
      } catch (error) {
        toast.error(
          error instanceof ApiError
            ? error.message
            : t("siteDocs.importFailed"),
        );
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [importDocs, t],
  );

  const handleExportAll = useCallback(async () => {
    try {
      const result = await exportAll.mutateAsync();
      for (const doc of result.docs) {
        downloadBlob(doc.filename, doc.markdown);
      }
      toast.success(t("siteDocs.exportAllDone"));
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : t("siteDocs.exportAllFailed"),
      );
    }
  }, [exportAll, t]);

  const columns = useMemo(
    () => buildColumns(t, canWrite, openEdit),
    [t, canWrite, openEdit],
  );

  const createAction: ReactNode = canWrite ? (
    <DraggableFabTrigger storageKey="site_docs_create_fab" onClick={openCreate}>
      <Plus className="size-6 md:size-4" />
      <span className="hidden md:inline">{t("siteDocs.create")}</span>
    </DraggableFabTrigger>
  ) : null;

  return (
    <PageLayout
      icon={FileText}
      title={t("siteDocs.title")}
      description={t("siteDocs.pageDescription")}
      action={
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,text/markdown"
            multiple
            className="hidden"
            onChange={(event) => void handleImport(event)}
          />
          {canWrite && (
            <Button
              variant="outline"
              size="sm"
              disabled={importDocs.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4" />
              <span className="hidden md:inline">{t("siteDocs.import")}</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={exportAll.isPending || docs.length === 0}
            onClick={() => void handleExportAll()}
          >
            <Download className="size-4" />
            <span className="hidden md:inline">{t("siteDocs.exportAll")}</span>
          </Button>
          {createAction}
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <DataTable
          columns={columns}
          data={docs}
          isLoading={isLoading && docs.length === 0}
          isError={Boolean(error) && docs.length === 0}
          error={error}
          emptyMessage={t("siteDocs.empty")}
          emptyIcon={<FileText className="size-8 text-muted-foreground" />}
          loadingMessage={t("siteDocs.loading")}
          manualSorting={false}
        />
      </div>

      {canWrite && (
        <SiteDocEditorSheet
          open={editorOpen}
          onOpenChange={setEditorOpen}
          doc={editingDoc}
        />
      )}
    </PageLayout>
  );
}
