import { FilterBar } from "@be-water/client-kit";
import { useTranslation } from "react-i18next";

import { TenantCombobox } from "./TenantCombobox.js";

export function UsersFilterBar({
  search,
  tenant_slug,
  hasActiveFilters,
  onSearchChange,
  onTenantChange,
  onReset,
}: {
  search?: string;
  tenant_slug?: string;
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onTenantChange: (slug: string | null) => void;
  onReset: () => void;
}) {
  const { t } = useTranslation(["platform", "common"]);

  return (
    <FilterBar
      search={{
        value: search,
        onCommit: (value: string) => onSearchChange(value.trim()),
        placeholder: t("users.filters.searchPlaceholder"),
        className: "max-w-40",
      }}
      inlineContent={
        <TenantCombobox
          value={tenant_slug ?? null}
          onValueChange={onTenantChange}
          placeholder={t("common:tenant")}
          showClear
          className="w-40"
        />
      }
      hasActiveFilters={hasActiveFilters}
      onReset={onReset}
    />
  );
}
