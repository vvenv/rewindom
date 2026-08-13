import type { ReactElement } from "react";

import { PageFilterBar } from "@rewindom/client-kit";
import { optionsFromLabels } from "@rewindom/client-kit/lib/filter-chip-options";
import { hasActiveFilters } from "@rewindom/client-kit/lib/list-url-params";
import { getLocaleNativeLabel, type AppLocale } from "@rewindom/shared";
import { useTranslation } from "react-i18next";

import type { SitePageFilterState } from "../lib/site-page-list.js";

/**
 * 页面列表的筛选：搜索 + 状态 +（多语言站点才有的）语言。
 *
 * 没有排序 chip——顺序由租户自己排（`sort_order`），见 `useSitePagesPage`。
 */
export function SitePageFilters({
  filters,
  locales,
  onFiltersChange,
}: {
  filters: SitePageFilterState;
  /** 列表里出现过的语言；只有一种时这组 chip 不渲染。 */
  locales: readonly AppLocale[];
  onFiltersChange: (filters: SitePageFilterState) => void;
}): ReactElement {
  const { t } = useTranslation("marketing");

  const statusOptions = optionsFromLabels([
    { value: "", label: t("cms.filterStatusAll") },
    { value: "published", label: t("cms.statusPublished") },
    { value: "draft", label: t("cms.statusDraft") },
    { value: "dirty", label: t("cms.statusDirty") },
  ]);

  const localeOptions = optionsFromLabels([
    { value: "", label: t("cms.filterLocaleAll") },
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
        onCommit: (value) => onFiltersChange({ q: value.trim() || undefined }),
        placeholder: t("cms.searchPlaceholder"),
        className: "max-w-56",
      }}
      groups={[
        {
          id: "locale",
          options: locales.length > 1 ? localeOptions : [],
          hideWhenEmpty: true,
          value: filters.locale ?? "",
          onChange: (value) => onFiltersChange({ locale: value || undefined }),
        },
        {
          id: "status",
          options: statusOptions,
          value: filters.status ?? "",
          onChange: (value) => onFiltersChange({ status: value || undefined }),
        },
      ]}
      hasActiveFilters={hasActiveFilters({
        q: filters.q,
        status: filters.status,
        locale: filters.locale,
      })}
      onReset={() =>
        onFiltersChange({
          q: undefined,
          status: undefined,
          locale: undefined,
        })
      }
    />
  );
}
