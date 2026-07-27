import type { ReactNode } from "react";

interface MockFilterGroup {
  id: string;
  options: Array<{ value: string; label: ReactNode }>;
  value: string;
  onChange: (value: string) => void;
}

interface MockPageFilterBarProps {
  search?: {
    placeholder: string;
    onCommit: (value: string) => void;
    value?: string;
  };
  inlineContent?: ReactNode;
  expandedContent?: ReactNode;
  onReset?: () => void;
  hasActiveFilters?: boolean;
  groups?: MockFilterGroup[];
}

export function mockPageFilterBar({
  search,
  inlineContent,
  expandedContent,
  onReset,
  hasActiveFilters,
  groups,
}: MockPageFilterBarProps) {
  return (
    <div data-testid="page-filter-bar">
      {search ? (
        <input
          data-testid="search"
          value={search.value ?? ""}
          placeholder={search.placeholder}
          onChange={(event) => search.onCommit(event.target.value)}
        />
      ) : null}
      {groups?.map((group) => (
        <div key={group.id} data-testid={`filter-group-${group.id}`}>
          {group.options.map((option) => (
            <button
              key={`${group.id}-${option.value}`}
              type="button"
              onClick={() => group.onChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      ))}
      {inlineContent}
      {expandedContent}
      {hasActiveFilters && onReset ? (
        <button type="button" title="重置所有筛选" onClick={onReset}>
          重置
        </button>
      ) : null}
    </div>
  );
}

export function mockDebouncedSearchInput({
  placeholder,
  onCommit,
  value,
}: {
  placeholder?: string;
  onCommit: (value: string) => void;
  value?: string;
}) {
  return (
    <input
      data-testid="search"
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(event) => onCommit(event.target.value)}
    />
  );
}

export const clientShellTestMock = {
  PageFilterBar: (props: MockPageFilterBarProps) => mockPageFilterBar(props),
  FilterBar: (props: MockPageFilterBarProps) => mockPageFilterBar(props),
  DebouncedSearchInput: mockDebouncedSearchInput,
  DateTimeRangePicker: () => <div data-testid="datetime-range-picker" />,
  useTenantFilter: () => () => <div data-testid="tenant-combobox" />,
  useTenantQueryScope: () => null,
};
