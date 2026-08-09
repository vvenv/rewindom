import { useMemo, useState, type ReactElement } from "react";

import {
  DataTable,
  DataTableColumnHeader,
  type DataTableFeatures,
} from "@be-water/client-kit";
import { getLocaleNativeLabel } from "@be-water/shared";
import { Badge } from "@be-water/ui/badge";
import { Button } from "@be-water/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@be-water/ui/dropdown-menu";
import { Spinner } from "@be-water/ui/spinner";
import {
  CloudOff,
  CloudUpload,
  Copy,
  Download,
  FileText,
  MoreVertical,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  docPath,
  formatDocDate,
  type MarketingDocListItem,
} from "../../shared/marketing-doc.js";

import { SiteDocDuplicateSheet } from "./SiteDocDuplicateSheet.js";
import { SitePublishStatus } from "./SitePublishStatus.js";

import type { SiteDocActions } from "../hooks/use-site-doc-actions.js";
import type {
  ColumnDef,
  OnChangeFn,
  SortingState,
} from "@tanstack/react-table";
import type { TFunction } from "i18next";

/** 默认每页条数；实际值来自 URL `page_size`。 */
const DEFAULT_PAGE_SIZE = 20;

function DocRowActions({
  doc,
  canWrite,
  actions,
  onEdit,
}: {
  doc: MarketingDocListItem;
  canWrite: boolean;
  actions: SiteDocActions;
  onEdit: (doc: MarketingDocListItem) => void;
}): ReactElement {
  const { t } = useTranslation("marketing");
  const isPublished = doc.status === "published";
  const pending = actions.pendingId === doc.id;
  const [duplicateOpen, setDuplicateOpen] = useState(false);

  // 只读用户唯一能做的就是导出，不值得为一项开一个菜单
  if (!canWrite) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        title={t("siteDocs.export")}
        aria-label={t("siteDocs.export")}
        disabled={pending}
        onClick={() => void actions.exportOne(doc)}
      >
        {pending ? (
          <Spinner className="size-3.5" />
        ) : (
          <Download className="size-3.5" />
        )}
      </Button>
    );
  }

  return (
    <div className="flex items-center justify-end gap-0.5 text-muted-foreground">
      {/* 发布 / 取消发布是最高频的一步，不该埋进菜单里 */}
      <Button
        variant="ghost"
        size="icon-sm"
        title={t(isPublished ? "siteDocs.unpublish" : "siteDocs.publish")}
        aria-label={t(isPublished ? "siteDocs.unpublish" : "siteDocs.publish")}
        disabled={pending}
        onClick={() => void actions.togglePublish(doc)}
      >
        {pending ? (
          <Spinner className="size-3.5" />
        ) : isPublished ? (
          <CloudOff className="size-3.5" />
        ) : (
          <CloudUpload className="size-3.5" />
        )}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("siteDocs.actions")}
          >
            <MoreVertical className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onEdit(doc)}>
            <Pencil className="size-4" />
            {t("siteDocs.edit")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDuplicateOpen(true)}>
            <Copy className="size-4" />
            {t("siteDocs.duplicate")}
          </DropdownMenuItem>
          {doc.content_dirty ? (
            <DropdownMenuItem onSelect={() => void actions.revert(doc)}>
              <RotateCcw className="size-4" />
              {t("siteDocs.revert")}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onSelect={() => void actions.exportOne(doc)}>
            <Download className="size-4" />
            {t("siteDocs.export")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => void actions.remove(doc)}
          >
            <Trash2 className="size-4" />
            {t("siteDocs.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* 菜单项当不了 SheetTrigger（一点菜单就关），所以受控地挂在外面 */}
      <SiteDocDuplicateSheet
        doc={doc}
        open={duplicateOpen}
        onOpenChange={setDuplicateOpen}
        onDuplicated={(created) =>
          onEdit({
            id: created.id,
            slug: created.slug,
            locale: created.locale,
            title: created.title_draft,
            description: created.description_draft,
            category: created.category_draft,
            status: created.status,
            content_dirty: created.content_dirty,
            sort_order: created.sort_order_draft,
            updated_at: created.updated_at,
          })
        }
      />
    </div>
  );
}

function buildColumns(
  t: TFunction,
  locale: string,
  canWrite: boolean,
  showLocale: boolean,
  actions: SiteDocActions,
  onEdit: (doc: MarketingDocListItem) => void,
): ColumnDef<DataTableFeatures, MarketingDocListItem>[] {
  return [
    {
      accessorKey: "title",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("siteDocs.title")} />
      ),
      cell: ({ row }) => (
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate font-medium">{row.original.title}</span>
          {row.original.description ? (
            <span className="line-clamp-1 text-xs text-muted-foreground">
              {row.original.description}
            </span>
          ) : null}
          {/* 窄屏收起路径列，路径挪到标题下面——它是识别文档的第二线索 */}
          <span className="truncate font-mono text-xs text-muted-foreground md:hidden">
            {docPath(row.original.slug)}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "slug",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("siteDocs.slug")} />
      ),
      // 站点跑在租户自己的域名上，管理端拼不出可点的绝对地址——按页面列表的做法
      // 只展示逻辑路径，不给一个点了 404 的链接
      meta: { className: "hidden md:table-cell" },
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {docPath(row.original.slug)}
        </span>
      ),
    },
    {
      accessorKey: "category",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("siteDocs.category")} />
      ),
      meta: { className: "hidden lg:table-cell" },
      cell: ({ row }) =>
        row.original.category ? (
          <Badge variant="outline">{row.original.category}</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    /*
      语言列只在库里真有多种语言时才占位置：同一个 slug 每种语言各一行，没有这一列
      时两行长得一模一样（标题是译文，一眼看不出哪行是哪种语言）。单语言站点则相反，
      整列恒定值纯属噪音——所以按内容决定画不画。
    */
    ...(showLocale
      ? [
          {
            accessorKey: "locale",
            header: ({ column }) => (
              <DataTableColumnHeader
                column={column}
                title={t("cms.fieldLocale")}
              />
            ),
            meta: { className: "hidden lg:table-cell" },
            cell: ({ row }) => (
              <Badge variant="secondary">
                {getLocaleNativeLabel(row.original.locale)}
              </Badge>
            ),
          } satisfies ColumnDef<DataTableFeatures, MarketingDocListItem>,
        ]
      : []),
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("siteDocs.status")} />
      ),
      cell: ({ row }) => (
        <SitePublishStatus
          status={row.original.status}
          contentDirty={row.original.content_dirty}
        />
      ),
    },
    {
      accessorKey: "updated_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("siteDocs.updated")} />
      ),
      meta: { className: "hidden lg:table-cell" },
      cell: ({ row }) => (
        <span className="text-xs whitespace-nowrap text-muted-foreground">
          {formatDocDate(row.original.updated_at, locale)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      meta: { align: "right" },
      cell: ({ row }) => (
        // 行点击进编辑，行内按钮不该顺带触发
        <div onClick={(event) => event.stopPropagation()}>
          <DocRowActions
            doc={row.original}
            canWrite={canWrite}
            actions={actions}
            onEdit={onEdit}
          />
        </div>
      ),
    },
  ];
}

export function SiteDocsTable({
  docs,
  filteredCount,
  totalCount,
  page,
  pageSize = DEFAULT_PAGE_SIZE,
  pageCount,
  showLocale,
  isLoading,
  isError,
  error,
  canWrite,
  actions,
  sorting,
  onSortingChange,
  onEdit,
}: {
  docs: MarketingDocListItem[];
  /** 筛选后的总数（分页 total）。 */
  filteredCount: number;
  /** 未经筛选的总数：用来区分「一篇都还没有」和「筛掉了」两种空态。 */
  totalCount: number;
  page: number;
  pageSize?: number;
  pageCount: number;
  /** 库里有不止一种语言——按未筛选的全量算，别让「筛到只剩一种」把列筛没了。 */
  showLocale: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  canWrite: boolean;
  actions: SiteDocActions;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  onEdit: (doc: MarketingDocListItem) => void;
}): ReactElement {
  const { t, i18n } = useTranslation("marketing");
  const columns = useMemo(
    () => buildColumns(t, i18n.language, canWrite, showLocale, actions, onEdit),
    [t, i18n.language, canWrite, showLocale, actions, onEdit],
  );
  const filteredEmpty = totalCount > 0 && filteredCount === 0;

  return (
    <DataTable
      columns={columns}
      data={docs}
      isLoading={isLoading && totalCount === 0}
      isError={isError && totalCount === 0}
      error={error}
      emptyIcon={FileText}
      emptyTitle={
        filteredEmpty ? t("siteDocs.emptyFiltered") : t("siteDocs.empty")
      }
      emptyDescription={
        filteredEmpty
          ? t("siteDocs.emptyFilteredHint")
          : t("siteDocs.emptyHint")
      }
      loadingMessage={t("siteDocs.loading")}
      page={page}
      pageSize={pageSize}
      total={filteredCount}
      pageCount={pageCount}
      sorting={sorting}
      onSortingChange={onSortingChange}
      onRowClick={canWrite ? onEdit : undefined}
    />
  );
}
