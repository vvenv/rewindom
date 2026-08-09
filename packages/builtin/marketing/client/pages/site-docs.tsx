import { useCallback, useMemo, useState, type ReactElement } from "react";

import { PageLayout, usePermissions } from "@be-water/client-kit";
import { DraggableFabTrigger } from "@be-water/ui/draggable-fab";
import { FileText, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  SiteDocCreateSheet,
  SiteDocEditorSheet,
} from "../components/SiteDocEditorSheet.js";
import { SiteDocFilters } from "../components/SiteDocFilters.js";
import { SiteDocsTable } from "../components/SiteDocsTable.js";
import { SiteDocTransferActions } from "../components/SiteDocTransferActions.js";
import { useSiteDocActions } from "../hooks/use-site-doc-actions.js";
import { useSiteDocsPage } from "../hooks/use-site-docs-page.js";
import { useSiteDocs } from "../hooks/useSiteDocs.js";
import {
  collectDocCategories,
  collectDocLocales,
  filterSiteDocs,
  paginateSiteDocs,
  sortSiteDocs,
} from "../lib/site-doc-list.js";

import type { MarketingDocListItem } from "../../shared/marketing-doc.js";

export function SiteDocs(): ReactElement {
  const { t } = useTranslation("marketing");
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("site.write");
  const { data, isLoading, isError, error } = useSiteDocs();
  const docs = useMemo(() => data ?? [], [data]);

  const {
    q,
    category,
    status,
    locale,
    page,
    pageSize,
    sortBy,
    sortDir,
    sorting,
    handleSortingChange,
    handleFiltersChange,
  } = useSiteDocsPage();
  const actions = useSiteDocActions();

  const [editingDoc, setEditingDoc] = useState<MarketingDocListItem | null>(
    null,
  );
  const [editorOpen, setEditorOpen] = useState(false);

  const categories = useMemo(() => collectDocCategories(docs), [docs]);
  const locales = useMemo(() => collectDocLocales(docs), [docs]);
  // 全量接口 → 本地筛选 / 排序 / 切片；分页态仍走 URL，与其它列表页同口径
  const listPage = useMemo(() => {
    const filtered = filterSiteDocs(docs, { q, category, status, locale });
    const sorted = sortSiteDocs(filtered, sortBy, sortDir);
    return paginateSiteDocs(sorted, page, pageSize);
  }, [docs, q, category, status, locale, sortBy, sortDir, page, pageSize]);

  const openEdit = useCallback((doc: MarketingDocListItem) => {
    setEditingDoc(doc);
    setEditorOpen(true);
  }, []);

  return (
    <PageLayout
      icon={FileText}
      title={t("siteDocs.pageTitle")}
      description={t("siteDocs.pageDescription")}
      action={
        <>
          <SiteDocTransferActions
            canWrite={canWrite}
            hasDocs={docs.length > 0}
          />
          {canWrite ? (
            <SiteDocCreateSheet>
              <DraggableFabTrigger storageKey="site_docs_create_fab">
                <Plus className="size-6 md:size-4" />
                <span className="hidden md:inline">{t("siteDocs.create")}</span>
              </DraggableFabTrigger>
            </SiteDocCreateSheet>
          ) : null}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* 一篇都还没有时不铺筛选栏——空表上面挂一排筛选只是噪音 */}
        {docs.length > 0 ? (
          <SiteDocFilters
            filters={{ q, category, status, locale }}
            categories={categories}
            locales={locales}
            onFiltersChange={handleFiltersChange}
          />
        ) : null}

        <SiteDocsTable
          docs={listPage.items}
          filteredCount={listPage.total}
          totalCount={docs.length}
          page={listPage.page}
          pageSize={pageSize}
          pageCount={listPage.page_count}
          showLocale={locales.length > 1}
          isLoading={isLoading}
          isError={isError}
          error={error}
          canWrite={canWrite}
          actions={actions}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          onEdit={openEdit}
        />
      </div>

      {canWrite ? (
        <SiteDocEditorSheet
          open={editorOpen}
          onOpenChange={setEditorOpen}
          doc={editingDoc}
        />
      ) : null}
    </PageLayout>
  );
}
