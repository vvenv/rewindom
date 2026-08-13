import {
  PageFilterBar,
  SEARCH_PARAM_FILTER_ALL,
} from "@rewindom/module-sdk/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rewindom/ui/select";
import { useTranslation } from "react-i18next";

import { getBookmarkSortOptions } from "../lib/bookmark-sort.js";

import type { BookmarkHostFacet } from "../../shared/index.js";

interface BookmarkFiltersProps {
  q?: string;
  hostValue: string;
  hosts: BookmarkHostFacet[];
  sortValue: string;
  isFiltered: boolean;
  onFiltersChange: (filters: { q?: string }) => void;
  onHostChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onReset: () => void;
}

export function BookmarkFilters({
  q,
  hostValue,
  hosts,
  sortValue,
  isFiltered,
  onFiltersChange,
  onHostChange,
  onSortChange,
  onReset,
}: BookmarkFiltersProps) {
  const { t } = useTranslation("bookmark");
  const sortOptions = getBookmarkSortOptions(t);

  return (
    <PageFilterBar
      search={{
        value: q,
        onCommit: (value) => {
          onFiltersChange({ q: value.trim() || undefined });
        },
        placeholder: t("searchPlaceholder"),
        className: "max-w-56",
      }}
      inlineContent={
        <Select value={sortValue} onValueChange={onSortChange}>
          <SelectTrigger aria-label={t("sortAriaLabel")} className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" align="start">
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
      groups={[
        {
          id: "host",
          value: hostValue,
          onChange: onHostChange,
          // 只有一个站点时分组是废话，藏起来。
          hideWhenEmpty: true,
          options:
            hosts.length > 1
              ? [
                  { value: SEARCH_PARAM_FILTER_ALL, label: t("hostAll") },
                  ...hosts.map((facet) => ({
                    value: facet.host,
                    label: `${facet.host} (${facet.count})`,
                  })),
                ]
              : [],
          maxVisibleOptions: 8,
        },
      ]}
      hasActiveFilters={isFiltered}
      onReset={onReset}
    />
  );
}
