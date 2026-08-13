import { useCallback, useRef, useState, type ReactElement } from "react";

import { PageLayout, usePermissions } from "@rewindom/client-kit";
import { hasActiveFilters } from "@rewindom/client-kit/lib/list-url-params";
import { normalizeLocale, type AppLocale  } from "@rewindom/shared";
import { DraggableFabTrigger } from "@rewindom/ui/draggable-fab";
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
import { useSite } from "../../../marketing/client/hooks/useSite.js";
import { useSiteDocs } from "../hooks/useSiteDocs.js";

import type { SiteDocCategory } from "../../shared/site-doc-category.js";
import type { SiteDocListItem } from "../../shared/site-doc.js";

export function SiteDocs(): ReactElement {
  const { t } = useTranslation("site-docs");
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("docs.write");

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

  const filters = { q, category, status, locale };
  const listQuery = {
    q,
    category,
    status,
    locale,
    page,
    page_size: pageSize,
    sort_by: sortBy,
    sort_dir: sortDir,
  };
  const { data, isLoading, isFetching, isError, error } = useSiteDocs(listQuery);

  const items = data?.items ?? [];
  const filteredCount = data?.total ?? 0;
  const actions = useSiteDocActions();

  // 筛选切换时 data 短暂为空：用上一轮 facets，避免筛选栏整块卸载再挂载
  const siteQuery = useSite();
  const defaultLocale = normalizeLocale(siteQuery.data?.default_locale);

  const facetsRef = useRef<{
    total_all: number;
    categories: string[];
    category_catalog: SiteDocCategory[];
    locales: AppLocale[];
  }>({ total_all: 0, categories: [], category_catalog: [], locales: [] });
  if (data) {
    facetsRef.current = {
      total_all: data.total_all,
      categories: data.categories,
      category_catalog: data.category_catalog,
      locales: data.locales,
    };
  }
  const totalAll = data?.total_all ?? facetsRef.current.total_all;
  const categories = data?.categories ?? facetsRef.current.categories;
  const categoryCatalog =
    data?.category_catalog ?? facetsRef.current.category_catalog;
  const locales = data?.locales ?? facetsRef.current.locales;

  const [editingDoc, setEditingDoc] = useState<SiteDocListItem | null>(
    null,
  );
  const [editorOpen, setEditorOpen] = useState(false);

  const openEdit = useCallback((doc: SiteDocListItem) => {
    setEditingDoc(doc);
    setEditorOpen(true);
  }, []);

  const showFilters =
    totalAll > 0 ||
    hasActiveFilters({
      q: filters.q,
      category: filters.category,
      status: filters.status,
      locale: filters.locale,
    });

  return (
    <PageLayout
      icon={FileText}
      title={t("siteDocs.pageTitle")}
      description={t("siteDocs.pageDescription")}
      action={
        <>
          <SiteDocTransferActions
            canWrite={canWrite}
            hasDocs={totalAll > 0}
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
        {showFilters ? (
          <SiteDocFilters
            filters={filters}
            categories={categories}
            categoryCatalog={categoryCatalog}
            locales={locales}
            defaultLocale={defaultLocale}
            onFiltersChange={handleFiltersChange}
          />
        ) : null}

        <SiteDocsTable
          docs={items}
          filteredCount={filteredCount}
          totalCount={totalAll}
          page={data?.page ?? page}
          pageSize={pageSize}
          pageCount={data?.page_count ?? 1}
          showLocale={locales.length > 1}
          isLoading={isLoading || (isFetching && items.length === 0)}
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
