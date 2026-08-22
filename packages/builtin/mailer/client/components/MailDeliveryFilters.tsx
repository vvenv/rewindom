import { FilterBar } from "@rewindom/client-kit";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rewindom/ui/select";
import { useTranslation } from "react-i18next";

import { MAIL_DELIVERY_STATUSES } from "../../shared/index.js";

export interface MailDeliveryFilterValues {
  q?: string;
  status?: string;
  source?: string;
}

interface MailDeliveryFiltersProps {
  filters: MailDeliveryFilterValues;
  onFiltersChange: (filters: MailDeliveryFilterValues) => void;
}

export function MailDeliveryFilters({
  filters,
  onFiltersChange,
}: MailDeliveryFiltersProps) {
  const { t } = useTranslation(["mailer", "common"]);

  const hasActiveFilters = Boolean(filters.q || filters.status || filters.source);

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
            {MAIL_DELIVERY_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {t(`deliveryStatus.${status}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
      hasActiveFilters={hasActiveFilters}
      onReset={() =>
        onFiltersChange({ q: undefined, status: undefined, source: undefined })
      }
    />
  );
}
