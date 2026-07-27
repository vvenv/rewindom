
import { Button } from "@be-water/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@be-water/ui/input-group";
import { cn } from "@be-water/ui/utils";
import { Search, X } from "lucide-react";

import { useDebouncedInput } from "../hooks/useDebouncedInput";

interface DebouncedSearchInputProps extends Omit<
  React.ComponentProps<typeof InputGroupInput>,
  "value" | "onChange" | "onCompositionStart" | "onCompositionEnd" | "onKeyDown"
> {
  value: string | undefined;
  onCommit: (value: string) => void;
  debounceMs?: number;
  showClear?: boolean;
}

export function DebouncedSearchInput({
  value,
  onCommit,
  debounceMs,
  showClear = true,
  className,
  ...inputProps
}: DebouncedSearchInputProps) {
  const {
    inputValue,
    clear,
    inputProps: debouncedInputProps,
  } = useDebouncedInput({
    value,
    onCommit,
    debounceMs,
  });

  return (
    <InputGroup className={cn("min-w-0 w-full sm:w-auto", className)}>
      <InputGroupAddon>
        <Search className="size-4" />
      </InputGroupAddon>
      <InputGroupInput {...debouncedInputProps} {...inputProps} />
      {showClear && inputValue ? (
        <Button
          variant="ghost"
          size="icon"
          aria-label="清除搜索"
          onClick={clear}
        >
          <X className="size-4" />
        </Button>
      ) : null}
    </InputGroup>
  );
}
