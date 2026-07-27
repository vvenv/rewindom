import type { FilterChipOption } from "../components/PageFilterBar.js";

export type { FilterChipOption };

export function optionsFromLabels(
  options: readonly { value: string; label: string }[],
  descriptions?: Record<string, string>,
): FilterChipOption[] {
  return options.map((option) => ({
    value: option.value,
    label: option.label,
    description: descriptions?.[option.value],
  }));
}
