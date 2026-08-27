import { PageFilterBar } from "@rewindom/module-sdk/client";
import { useTranslation } from "react-i18next";

interface ThingFiltersProps {
  q?: string;
  onFiltersChange: (filters: { q?: string }) => void;
}

export function ThingFilters({ q, onFiltersChange }: ThingFiltersProps) {
  const { t } = useTranslation("useless");

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
      hasActiveFilters={Boolean(q)}
      onReset={() => onFiltersChange({ q: undefined })}
    />
  );
}
