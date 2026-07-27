import { PageFilterBar } from "@be-water/client-kit";

interface NoteFiltersProps {
  q?: string;
  onFiltersChange: (filters: { q?: string }) => void;
}

export function NoteFilters({ q, onFiltersChange }: NoteFiltersProps) {
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
      hasActiveFilters={Boolean(q)}
      onReset={() => onFiltersChange({ q: undefined })}
    />
  );
}
