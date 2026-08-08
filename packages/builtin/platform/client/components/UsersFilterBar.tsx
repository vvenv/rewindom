import { FilterBar, usePublicConfig } from "@be-water/client-kit";
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
  const {
    data: { single_tenant },
  } = usePublicConfig();

  return (
    <FilterBar
      search={{
        value: search,
        onCommit: (value: string) => onSearchChange(value.trim()),
        placeholder: t("users.filters.searchPlaceholder"),
        className: "max-w-40",
      }}
      inlineContent={
        single_tenant ? undefined : (
          <TenantCombobox
            value={tenant_slug ?? null}
            onValueChange={onTenantChange}
            placeholder={t("common:tenant")}
            showClear
            className="w-40"
          />
        )
      }
      hasActiveFilters={hasActiveFilters}
      onReset={onReset}
    />
  );
}
