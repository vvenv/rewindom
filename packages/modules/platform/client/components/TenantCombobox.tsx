import { useCallback, useMemo, useState } from "react";

import { useDebouncedValue } from "@be-water/client-kit";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@be-water/ui/combobox";
import { cn } from "@be-water/ui/utils";
import { useTranslation } from "react-i18next";

import { usePlatformTenants } from "../hooks/usePlatformTenants.js";

import type { TenantSummary } from "../../shared/index.js";

interface TenantComboboxProps {
  value?: string | null;
  onValueChange: (slug: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  showTrigger?: boolean;
  showClear?: boolean;
  includeArchived?: boolean;
  className?: string;
}

function formatTenantLabel(tenant: TenantSummary): string {
  return `${tenant.name} (${tenant.slug})`;
}

export function TenantCombobox({
  value,
  onValueChange,
  placeholder,
  disabled = false,
  showTrigger = true,
  showClear = false,
  includeArchived = false,
  className,
}: TenantComboboxProps) {
  const { t } = useTranslation(["platform", "common"]);
  const resolvedPlaceholder =
    placeholder ?? t("tenants.combobox.placeholder");
  const [searchQuery, setSearchQuery] = useState("");
  const {
    debouncedValue: debouncedSearch,
    compositionInputProps,
    flushDebounced,
  } = useDebouncedValue(searchQuery);
  const [selectedTenantCache, setSelectedTenantCache] =
    useState<TenantSummary | null>(null);

  const { data: tenants = [] } = usePlatformTenants(includeArchived);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    flushDebounced("");
  }, [flushDebounced]);

  const filteredTenants = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    if (!query) return tenants;
    return tenants.filter(
      (tenant) =>
        tenant.slug.toLowerCase().includes(query) ||
        tenant.name.toLowerCase().includes(query),
    );
  }, [tenants, debouncedSearch]);

  const selectedTenant = useMemo(() => {
    if (!value) return null;
    const fromList = tenants.find((tenant) => tenant.slug === value);
    if (fromList) return fromList;
    if (selectedTenantCache?.slug === value) return selectedTenantCache;
    return null;
  }, [value, tenants, selectedTenantCache]);

  const items = useMemo(() => {
    if (
      !selectedTenant ||
      filteredTenants.some((tenant) => tenant.slug === selectedTenant.slug)
    ) {
      return filteredTenants;
    }
    return [...filteredTenants, selectedTenant];
  }, [filteredTenants, selectedTenant]);

  const handleChange = (tenant: TenantSummary | null) => {
    setSelectedTenantCache(tenant);
    clearSearch();
    onValueChange(tenant?.slug ?? null);
  };

  const handleInputValueChange = (
    inputValue: string,
    { reason }: { reason: string },
  ) => {
    if (reason === "input-change" || reason === "input-paste") {
      setSearchQuery(inputValue);
      return;
    }
    if (reason === "input-clear" || reason === "clear-press") {
      clearSearch();
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      clearSearch();
    }
  };

  return (
    <Combobox<TenantSummary>
      value={selectedTenant}
      onValueChange={handleChange}
      items={items}
      itemToStringLabel={formatTenantLabel}
      filter={null}
      disabled={disabled}
      autoHighlight
      onInputValueChange={handleInputValueChange}
      onOpenChange={handleOpenChange}
    >
      <ComboboxInput
        placeholder={resolvedPlaceholder}
        showTrigger={showTrigger}
        showClear={showClear}
        className={cn("max-w-none", className)}
        {...compositionInputProps}
      />
      <ComboboxContent>
        <ComboboxEmpty>{t("tenants.combobox.empty")}</ComboboxEmpty>
        <ComboboxList>
          {items.map((item) => (
            <ComboboxItem
              key={item.id}
              value={item}
              title={item.slug}
              className="whitespace-nowrap truncate"
            >
              {formatTenantLabel(item)}
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
