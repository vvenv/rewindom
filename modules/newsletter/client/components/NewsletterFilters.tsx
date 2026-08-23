import { FilterBar } from "@rewindom/module-sdk/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rewindom/ui/select";
import { useTranslation } from "react-i18next";

import { SUBSCRIBER_STATUSES } from "../../shared/index.js";

export interface NewsletterFilterValues {
  q?: string;
  status?: string;
}

export function NewsletterFilters({
  filters,
  onFiltersChange,
}: {
  filters: NewsletterFilterValues;
  onFiltersChange: (filters: NewsletterFilterValues) => void;
}) {
  const { t } = useTranslation(["newsletter", "common"]);

  return (
    <FilterBar
      search={{
        value: filters.q,
        onCommit: (value: string) => {
          onFiltersChange({ ...filters, q: value.trim() || undefined });
        },
        placeholder: t("filters.q"),
        className: "w-56",
      }}
      inlineContent={
        <Select
          value={filters.status ?? ""}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, status: value || undefined })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={t("filters.allStatuses")} />
          </SelectTrigger>
          <SelectContent position="popper" align="start">
            {SUBSCRIBER_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {t(`status.${status}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
      hasActiveFilters={Boolean(filters.q || filters.status)}
      onReset={() => onFiltersChange({ q: undefined, status: undefined })}
    />
  );
}
