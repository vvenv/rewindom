import { PageFilterBar } from "@be-water/client-kit";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@be-water/ui/select";
import { useTranslation } from "react-i18next";

import { getNoteSortOptions } from "../lib/note-sort.js";

interface NoteFiltersProps {
  q?: string;
  sortValue: string;
  onFiltersChange: (filters: { q?: string }) => void;
  onSortChange: (value: string) => void;
}

export function NoteFilters({
  q,
  sortValue,
  onFiltersChange,
  onSortChange,
}: NoteFiltersProps) {
  const { t } = useTranslation("notes");
  const sortOptions = getNoteSortOptions(t);

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
      hasActiveFilters={Boolean(q)}
      onReset={() => onFiltersChange({ q: undefined })}
    />
  );
}
