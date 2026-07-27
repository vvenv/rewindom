import { PageFilterBar } from "@be-water/client-kit";
import { optionsFromLabels } from "@be-water/client-kit/lib/filter-chip-options";

const ADMIN_TYPE_FILTER_OPTIONS = [
  { value: "", label: "全部类型" },
  { value: "system_admin", label: "系统管理员" },
  { value: "regular", label: "普通用户" },
] as const;

interface UserFiltersProps {
  filters: {
    q?: string;
    admin_type?: string;
  };
  onFiltersChange: (filters: { q?: string; admin_type?: string }) => void;
}

export function UserFilters({ filters, onFiltersChange }: UserFiltersProps) {
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
        placeholder: "搜索用户名...",
        className: "max-w-40",
      }}
      groups={[
        {
          id: "admin_type",
          options: optionsFromLabels(ADMIN_TYPE_FILTER_OPTIONS),
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
