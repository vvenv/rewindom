import { PageFilterBar } from "@be-water/client-kit";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@be-water/ui/select";

import { NOTE_SORT_OPTIONS } from "../lib/note-sort.js";

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
  return (
    <PageFilterBar
      search={{
        value: q,
        onCommit: (value) => {
          onFiltersChange({ q: value.trim() || undefined });
        },
        placeholder: "搜索标题或内容…",
        className: "max-w-56",
      }}
      inlineContent={
        <Select value={sortValue} onValueChange={onSortChange}>
          <SelectTrigger aria-label="排序方式" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" align="start">
            {NOTE_SORT_OPTIONS.map((option) => (
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
