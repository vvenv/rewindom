import type { ReactElement } from "react";

import { PageFilterBar } from "@be-water/client-kit";
import { optionsFromLabels } from "@be-water/client-kit/lib/filter-chip-options";
import { useTranslation } from "react-i18next";

import {
  hasActiveDocFilters,
  type SiteDocFilterState,
} from "../lib/site-doc-list.js";

/** 分类 chip 超过这个数就折叠——分类是租户自定义的，可能有十几个。 */
const MAX_VISIBLE_CATEGORIES = 6;

export function SiteDocFilters({
  filters,
  categories,
  onFiltersChange,
}: {
  filters: SiteDocFilterState;
  categories: readonly string[];
  onFiltersChange: (filters: SiteDocFilterState) => void;
}): ReactElement {
  const { t } = useTranslation("marketing");

  const statusOptions = optionsFromLabels([
    { value: "", label: t("siteDocs.filterStatusAll") },
    { value: "published", label: t("siteDocs.published") },
    { value: "draft", label: t("siteDocs.draft") },
    { value: "dirty", label: t("siteDocs.dirty") },
  ]);

  const categoryOptions = optionsFromLabels([
    { value: "", label: t("siteDocs.filterCategoryAll") },
    ...categories.map((category) => ({ value: category, label: category })),
  ]);

  return (
    <PageFilterBar
      search={{
        value: filters.q,
        onCommit: (value) =>
          onFiltersChange({ ...filters, q: value.trim() || undefined }),
        placeholder: t("siteDocs.searchPlaceholder"),
        className: "max-w-56",
      }}
      groups={[
        {
          id: "status",
          options: statusOptions,
          value: filters.status ?? "",
          onChange: (value) =>
            onFiltersChange({ ...filters, status: value || undefined }),
        },
        {
          // 只有一个分类时这组 chip 等于没筛选，直接不渲染
          id: "category",
          options: categories.length > 1 ? categoryOptions : [],
          hideWhenEmpty: true,
          maxVisibleOptions: MAX_VISIBLE_CATEGORIES,
          value: filters.category ?? "",
          onChange: (value) =>
            onFiltersChange({ ...filters, category: value || undefined }),
        },
      ]}
      hasActiveFilters={hasActiveDocFilters(filters)}
      onReset={() =>
        onFiltersChange({
          q: undefined,
          category: undefined,
          status: undefined,
        })
      }
    />
  );
}
