import { FilterBar } from "@be-water/client-kit";

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
  return (
    <FilterBar
      search={{
        value: search,
        onCommit: (value: string) => onSearchChange(value.trim()),
        placeholder: "搜索用户名",
        className: "max-w-40",
      }}
      inlineContent={
        <TenantCombobox
          value={tenant_slug ?? null}
          onValueChange={onTenantChange}
          placeholder="租户"
          showClear
          className="w-40"
        />
      }
      hasActiveFilters={hasActiveFilters}
      onReset={onReset}
    />
  );
}
