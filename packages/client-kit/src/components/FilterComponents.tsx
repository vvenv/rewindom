
import { Button } from "@rewindom/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@rewindom/ui/input-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@rewindom/ui/tooltip";
import { Search, X, RotateCcw } from "lucide-react";

import { useDebouncedInput } from "../hooks/useDebouncedInput";

export interface FilterSearchConfig {
  /** 搜索框占位符 */
  placeholder: string;
  /** Tooltip 提示列表 */
  tooltipItems: string[];
}

interface FilterSearchInputProps {
  config: FilterSearchConfig;
  value: string;
  onCommit: (value: string) => void;
  onClear?: () => void;
}

/**
 * 带 Tooltip 的搜索输入框组件
 * 统一了搜索框的 UI 结构和交互逻辑
 */
export function FilterSearchInput({
  config,
  value,
  onCommit,
  onClear,
}: FilterSearchInputProps) {
  const {
    inputValue: searchInput,
    clear: clearSearch,
    inputProps: searchInputProps,
  } = useDebouncedInput({
    value,
    onCommit: (val) => {
      onCommit(val.trim() || "");
    },
  });

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearSearch();
    onClear?.();
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <InputGroup className="w-full sm:max-w-50">
          <InputGroupAddon>
            <Search className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            {...searchInputProps}
            placeholder={config.placeholder}
          />
          {searchInput && (
            <Button variant="ghost" size="icon" onClick={handleClear}>
              <X className="size-4" />
            </Button>
          )}
        </InputGroup>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <ul className="list-disc list-inside flex flex-col gap-1">
          {config.tooltipItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}

interface FilterResetButtonProps {
  hasActiveFilters: boolean;
  onReset: () => void;
  title?: string;
}

/**
 * 条件显示的重置按钮组件
 * 当有活跃筛选条件时才显示
 */
export function FilterResetButton({
  hasActiveFilters,
  onReset,
  title = "重置所有筛选",
}: FilterResetButtonProps) {
  if (!hasActiveFilters) return null;

  return (
    <Button variant="outline" size="icon" onClick={onReset} title={title}>
      <RotateCcw className="size-3.5" />
    </Button>
  );
}
