import { PageFilterBar } from "@be-water/client-kit";
import { optionsFromLabels } from "@be-water/client-kit/lib/filter-chip-options";
import { useTranslation } from "react-i18next";

interface UserFiltersProps {
  filters: {
    q?: string;
    admin_type?: string;
  };
  onFiltersChange: (filters: { q?: string; admin_type?: string }) => void;
}

export function UserFilters({ filters, onFiltersChange }: UserFiltersProps) {
  const { t } = useTranslation("user");

  const adminTypeFilterOptions = [
    { value: "", label: t("filters.adminTypeAll") },
    { value: "system_admin", label: t("filters.adminTypeSystemAdmin") },
    { value: "regular", label: t("filters.adminTypeRegular") },
  ] as const;

  const hasActiveFilters =
    Boolean(filters.q) || Boolean(filters.admin_type);

  const handleReset = () => {
    onFiltersChange({ q: undefined, admin_type: undefined });
  };

  return (
    <PageFilterBar
      search={{
        value: filters.q,
        onCommit: (value) => {
          onFiltersChange({
            q: value.trim() || undefined,
            admin_type: filters.admin_type,
          });
        },
        placeholder: t("filters.searchPlaceholder"),
        className: "max-w-40",
      }}
      groups={[
        {
          id: "admin_type",
          options: optionsFromLabels(adminTypeFilterOptions),
          value: filters.admin_type ?? "",
          onChange: (value) => {
            onFiltersChange({
              q: filters.q,
              admin_type: value === "" ? undefined : value,
            });
          },
        },
      ]}
      hasActiveFilters={hasActiveFilters}
      onReset={handleReset}
    />
  );
}
