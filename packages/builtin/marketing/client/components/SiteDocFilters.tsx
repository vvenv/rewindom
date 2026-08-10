import type { ReactElement } from "react";

import { PageFilterBar } from "@be-water/client-kit";
import { optionsFromLabels } from "@be-water/client-kit/lib/filter-chip-options";
import { hasActiveFilters } from "@be-water/client-kit/lib/list-url-params";
import { getLocaleNativeLabel, type AppLocale } from "@be-water/shared";
import { useTranslation } from "react-i18next";

import type { SiteDocFilterState } from "../lib/site-doc-list.js";

import type { MarketingDocCategory } from "../../shared/marketing-doc-category.js";
import { categoryLabelMap } from "../../shared/marketing-doc-category.js";

/** 分类 chip 超过这个数就折叠——分类是租户自定义的，可能有十几个。 */
const MAX_VISIBLE_CATEGORIES = 6;

export function SiteDocFilters({
  filters,
  categories,
  categoryCatalog,
  locales,
  defaultLocale,
  onFiltersChange,
}: {
  filters: SiteDocFilterState;
  categories: readonly string[];
  categoryCatalog: readonly MarketingDocCategory[];
  /** 列表里出现过的语言；只有一种时这组 chip 不渲染。 */
  locales: readonly AppLocale[];
  defaultLocale: AppLocale;
  onFiltersChange: (filters: SiteDocFilterState) => void;
}): ReactElement {
  const { t } = useTranslation("marketing");
  const labelMap = categoryLabelMap(categoryCatalog, defaultLocale, defaultLocale);

  const statusOptions = optionsFromLabels([
    { value: "", label: t("siteDocs.filterStatusAll") },
    { value: "published", label: t("siteDocs.published") },
    { value: "draft", label: t("siteDocs.draft") },
    { value: "dirty", label: t("siteDocs.dirty") },
  ]);

  const categoryOptions = optionsFromLabels([
    { value: "", label: t("siteDocs.filterCategoryAll") },
    ...categories.map((category) => ({
      value: category,
      label: labelMap.get(category) ?? category,
    })),
  ]);

  const localeOptions = optionsFromLabels([
    { value: "", label: t("siteDocs.filterLocaleAll") },
    ...locales.map((locale) => ({
      value: locale,
      label: getLocaleNativeLabel(locale),
    })),
  ]);

  return (
    <PageFilterBar
      search={{
        value: filters.q,
        // 只传变更项：由 page hook 与 URL prev 合并，避免连点时散到过期 filters
        onCommit: (value) =>
          onFiltersChange({ q: value.trim() || undefined }),
        placeholder: t("siteDocs.searchPlaceholder"),
        className: "max-w-56",
      }}
      groups={[
        {
          // 语言放第一组：多语言站点这是最高频筛选，别埋进「更多筛选」
          id: "locale",
          options: locales.length > 1 ? localeOptions : [],
          hideWhenEmpty: true,
          value: filters.locale ?? "",
          onChange: (value) =>
            onFiltersChange({ locale: value || undefined }),
        },
        {
          id: "status",
          options: statusOptions,
          value: filters.status ?? "",
          onChange: (value) =>
            onFiltersChange({ status: value || undefined }),
        },
        {
          // 只有一个分类时这组 chip 等于没筛选，直接不渲染
          id: "category",
          options: categories.length > 1 ? categoryOptions : [],
          hideWhenEmpty: true,
          maxVisibleOptions: MAX_VISIBLE_CATEGORIES,
          value: filters.category ?? "",
          onChange: (value) =>
            onFiltersChange({ category: value || undefined }),
        },
      ]}
      hasActiveFilters={hasActiveFilters({
        q: filters.q,
        category: filters.category,
        status: filters.status,
        locale: filters.locale,
      })}
      onReset={() =>
        onFiltersChange({
          q: undefined,
          category: undefined,
          status: undefined,
          locale: undefined,
        })
      }
    />
  );
}
