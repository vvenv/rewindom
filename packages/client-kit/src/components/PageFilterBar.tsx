import { useState, type ReactNode } from "react";

import { Button } from "@be-water/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@be-water/ui/popover";
import { cn } from "@be-water/ui/utils";
import { ChevronDown, ChevronUp, CircleHelp } from "lucide-react";

import { useMediaQuery } from "../hooks/useMediaQuery";

import { DebouncedSearchInput } from "./DebouncedSearchInput";
import { FilterResetButton } from "./FilterComponents";



export interface FilterChipOption {
  value: string;
  label: ReactNode;
  className?: string;
  description?: string;
}

interface FilterChipGroup {
  id: string;
  options: FilterChipOption[];
  value: string;
  onChange: (value: string) => void;
  hideWhenEmpty?: boolean;
  /** 表示「未筛选」的选项值；选中时不使用主色高亮。默认取 options 首项。 */
  neutralValue?: string;
  /** 选项超过该数量时折叠，显示展开/收起。 */
  maxVisibleOptions?: number;
  /** 有选项说明时，说明浮层的标题。 */
  descriptionTitle?: string;
}

interface PageFilterBarSearchConfig {
  value?: string;
  onCommit: (value: string) => void;
  placeholder: string;
  className?: string;
}

export interface PageFilterBarProps {
  search?: PageFilterBarSearchConfig;
  /** 与搜索框同一行的自定义控件（如 Combobox、Select） */
  inlineContent?: ReactNode;
  groups?: FilterChipGroup[];
  expandedContent?: ReactNode;
  className?: string;
  onReset?: () => void;
  hasActiveFilters?: boolean;
  /**
   * `inline`：桌面端单行排列全部筛选（平台页使用）。
   * `stacked`：多行 + 可折叠次要筛选（企业侧列表页默认）。
   */
  layout?: "stacked" | "inline";
}

type DescribedFilterChipOption = FilterChipOption & { description: string };

function resolveVisibleOptions(
  options: FilterChipOption[],
  value: string,
  maxVisible: number,
  expanded: boolean,
): { visible: FilterChipOption[]; hiddenCount: number } {
  if (expanded || options.length <= maxVisible) {
    return { visible: options, hiddenCount: 0 };
  }

  const baseVisible = options.slice(0, maxVisible);
  const selectedOption = options.find((option) => option.value === value);
  const selectedHidden =
    selectedOption !== undefined &&
    !baseVisible.some((option) => option.value === value);

  if (selectedHidden) {
    return {
      visible: [...options.slice(0, maxVisible - 1), selectedOption],
      hiddenCount: options.length - maxVisible,
    };
  }

  return {
    visible: baseVisible,
    hiddenCount: options.length - maxVisible,
  };
}

function FilterChipDescriptionList({
  options,
  className,
  descriptionClassName,
}: {
  options: DescribedFilterChipOption[];
  className?: string;
  descriptionClassName?: string;
}) {
  return (
    <dl className={className}>
      {options.map((option) => (
        <div key={option.value}>
          <dt className="font-medium">{option.label}</dt>
          <dd className={descriptionClassName}>{option.description}</dd>
        </div>
      ))}
    </dl>
  );
}

function FilterChipHelp({ options }: { options: DescribedFilterChipOption[] }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon">
          <CircleHelp />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        className="max-h-[min(70vh,28rem)] w-[calc(100vw-2rem)] max-w-sm overflow-y-auto p-4"
      >
        <FilterChipDescriptionList
          options={options}
          className="flex flex-col gap-2"
          descriptionClassName="text-muted-foreground"
        />
      </PopoverContent>
    </Popover>
  );
}

function FilterChipGroupRow({
  options,
  value,
  onChange,
  neutralValue,
  maxVisibleOptions,
}: {
  options: FilterChipOption[];
  value: string;
  onChange: (value: string) => void;
  neutralValue?: string;
  maxVisibleOptions?: number;
}) {
  const [optionsExpanded, setOptionsExpanded] = useState(false);

  if (options.length === 0) {
    return null;
  }

  const { visible, hiddenCount } = resolveVisibleOptions(
    options,
    value,
    maxVisibleOptions ?? options.length,
    optionsExpanded,
  );
  const canCollapseOptions =
    maxVisibleOptions !== undefined && options.length > maxVisibleOptions;
  const resolvedNeutral = neutralValue ?? options[0]?.value;
  const describedOptions = options.filter(
    (option): option is DescribedFilterChipOption =>
      option.description != null && option.description !== "",
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {visible.map((option) => {
        const selected = option.value === value;
        const variant = selected
          ? option.value === resolvedNeutral
            ? "secondary"
            : "default"
          : "outline";
        return (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={variant}
            onClick={() => onChange(option.value)}
            className={option.className}
          >
            {option.label}
          </Button>
        );
      })}
      {describedOptions.length > 0 ? (
        <FilterChipHelp options={describedOptions} />
      ) : null}
      {canCollapseOptions ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1 text-muted-foreground"
          onClick={() => setOptionsExpanded((prev) => !prev)}
        >
          {optionsExpanded ? (
            <>
              收起
              <ChevronUp className="size-4" />
            </>
          ) : (
            <>
              展开 {hiddenCount} 项
              <ChevronDown className="size-4" />
            </>
          )}
        </Button>
      ) : null}
    </div>
  );
}

function renderChipGroups(groups: FilterChipGroup[]) {
  return groups.map((group) => (
    <FilterChipGroupRow
      key={group.id}
      options={group.options}
      value={group.value}
      onChange={group.onChange}
      neutralValue={group.neutralValue}
      maxVisibleOptions={group.maxVisibleOptions}
    />
  ));
}

export function PageFilterBar({
  search,
  inlineContent,
  groups = [],
  expandedContent,
  className,
  onReset,
  hasActiveFilters = false,
  layout = "stacked",
}: PageFilterBarProps) {
  const [expanded, setExpanded] = useState(false);

  const visibleGroupCount = useMediaQuery("(max-width: 767px)")
    ? search
      ? 0
      : 1
    : 1;

  const visibleGroups = groups.filter(
    (group) => !group.hideWhenEmpty || group.options.length > 0,
  );

  if (layout === "inline") {
    return (
      <div className={cn("flex items-center gap-2 flex-wrap", className)}>
        {inlineContent}
        {search ? (
          <DebouncedSearchInput
            value={search.value}
            onCommit={search.onCommit}
            placeholder={search.placeholder}
            className={search.className}
          />
        ) : null}
        {renderChipGroups(visibleGroups)}
        {expandedContent}
        {hasActiveFilters && onReset ? (
          <FilterResetButton
            hasActiveFilters={hasActiveFilters}
            onReset={onReset}
          />
        ) : null}
      </div>
    );
  }

  const primaryGroups = visibleGroups.slice(0, visibleGroupCount);
  const secondaryGroups = visibleGroups.slice(visibleGroupCount);
  const hasCollapsibleContent =
    secondaryGroups.length > 0 || Boolean(expandedContent);

  // 吸顶时保留的主行：优先搜索框，否则第一个筛选组。其余行随滚动滑到其背后。
  const stickyGroup = search ? undefined : primaryGroups[0];
  const belowGroups = search ? primaryGroups : primaryGroups.slice(1);

  return (
    <div
      className={cn(
        "flex gap-3",
        expanded ? "flex-col" : "flex-row",
        className,
      )}
    >
      {(search ?? inlineContent ?? stickyGroup) ? (
        <div className="flex flex-wrap items-center gap-2">
          {search ? (
            <DebouncedSearchInput
              value={search.value}
              onCommit={search.onCommit}
              placeholder={search.placeholder}
              className={cn("min-w-0 flex-1", search.className)}
            />
          ) : stickyGroup ? (
            <div className="min-w-0 flex-1 overflow-x-auto">
              <FilterChipGroupRow
                options={stickyGroup.options}
                value={stickyGroup.value}
                onChange={stickyGroup.onChange}
                neutralValue={stickyGroup.neutralValue}
                maxVisibleOptions={stickyGroup.maxVisibleOptions}
              />
            </div>
          ) : null}
          {inlineContent}
        </div>
      ) : null}

      {renderChipGroups(belowGroups)}

      {(hasCollapsibleContent || (hasActiveFilters && onReset)) && (
        <div className="inline-flex flex-wrap items-center gap-2">
          {hasCollapsibleContent ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1 text-muted-foreground"
              onClick={() => setExpanded((prev) => !prev)}
            >
              {expanded ? (
                <>
                  收起筛选
                  <ChevronUp className="size-4" />
                </>
              ) : (
                <>
                  更多筛选
                  <ChevronDown className="size-4" />
                </>
              )}
            </Button>
          ) : null}

          {hasActiveFilters && onReset ? (
            <FilterResetButton
              hasActiveFilters={hasActiveFilters}
              onReset={onReset}
            />
          ) : null}
        </div>
      )}

      {expanded && hasCollapsibleContent ? (
        <div className="flex flex-col gap-3">
          {renderChipGroups(secondaryGroups)}
          {expandedContent}
        </div>
      ) : null}
    </div>
  );
}
