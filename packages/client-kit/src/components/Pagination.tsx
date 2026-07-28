import { useRef, type KeyboardEvent, type ReactNode } from "react";

import { Button } from "@be-water/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@be-water/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@be-water/ui/select";
import { cn } from "@be-water/ui/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useSearchParams } from "react-router";

import { LIST_PAGE_SIZE_OPTIONS } from "../lib/list-url-params";

export interface PaginationProps {
  currentPage: number;
  pageCount: number;
  pageSize: number;
  total: number;
  canPrev: boolean;
  canNext: boolean;
  onPageSizeChange?: (size: number) => void;
  /**
   * `full`（默认）：总数 + 每页条数 + 页码列表 + 跳页输入，用于列表下方的主分页器。
   * `simple`：只有总数与上/下一页，用于表格上方的副分页器——同一页出现两个
   * 分页器时，上面那个只承担「翻页」，控件都留给下面那个，避免两处重复。
   */
  variant?: "full" | "simple";
  pageParam?: string;
  pageSizeParam?: string;
}

export function Pagination({
  currentPage,
  pageCount,
  pageSize,
  total,
  canPrev,
  canNext,
  onPageSizeChange,
  variant = "full",
  pageParam = "page",
  pageSizeParam = "page_size",
}: PaginationProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const jumpRef = useRef<HTMLInputElement>(null);
  const isSimple = variant === "simple";

  const handlePageChange = (pageIndex: number) => {
    const params = new URLSearchParams(searchParams);
    params.set(pageParam, String(pageIndex));
    setSearchParams(params);
  };

  const handlePageSizeChange = (size: number) => {
    const params = new URLSearchParams(searchParams);
    params.set(pageSizeParam, String(size));
    params.set(pageParam, "1");
    setSearchParams(params);
    onPageSizeChange?.(size);
  };

  const buildUrl = (pageIndex: number) => {
    const params = new URLSearchParams(searchParams);
    params.set(pageParam, String(pageIndex));
    return `?${params.toString()}`;
  };

  const handleJump = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const val = parseInt((e.target as HTMLInputElement).value, 10);
    if (!isNaN(val) && val >= 1 && val <= pageCount) {
      handlePageChange(val);
    }
    (e.target as HTMLInputElement).value = "";
  };

  const pages = buildPageNumbers(currentPage, pageCount);

  return (
    <div className="flex items-center gap-2 text-muted-foreground flex-wrap">
      <span className="shrink-0 text-sm">共 {total} 条</span>

      {!isSimple && (
        <PageSizeSelect
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
        />
      )}

      <div className="flex items-center gap-0.5">
        <StepLink
          search={canPrev ? buildUrl(currentPage - 1) : searchParams.toString()}
          disabled={!canPrev}
          label="上一页"
        >
          <ChevronLeft className="size-3.5" />
        </StepLink>
        {!isSimple && (
          <div className="hidden sm:flex items-center gap-0.5">
            {pages.map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="px-1 text-sm">
                  …
                </span>
              ) : (
                <Link
                  key={p}
                  to={{ search: buildUrl(p) }}
                  className={cn(
                    "h-7 min-w-[28px] rounded-md px-1.5 transition-colors flex items-center justify-center text-sm",
                    p === currentPage
                      ? "border border-secondary bg-secondary text-secondary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  {p}
                </Link>
              ),
            )}
          </div>
        )}
        <span
          className={cn(
            "px-2 text-muted-foreground text-sm",
            !isSimple && "sm:hidden",
          )}
        >
          {currentPage} / {pageCount}
        </span>
        <StepLink
          search={canNext ? buildUrl(currentPage + 1) : searchParams.toString()}
          disabled={!canNext}
          label="下一页"
        >
          <ChevronRight className="size-3.5" />
        </StepLink>
      </div>

      {!isSimple && (
        <InputGroup className="hidden sm:flex h-7 w-auto">
          <InputGroupAddon align="inline-start" className="text-sm">
            前往
          </InputGroupAddon>
          <InputGroupInput
            ref={jumpRef}
            type="number"
            min={1}
            max={pageCount}
            onKeyDown={handleJump}
            className="w-12 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <InputGroupAddon align="inline-end" className="text-sm">
            页
          </InputGroupAddon>
        </InputGroup>
      )}
    </div>
  );
}

function StepLink({
  search,
  disabled,
  label,
  children,
}: {
  search: string;
  disabled: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <Link to={{ search }} className="inline-flex">
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={disabled}
        aria-label={label}
      >
        {children}
      </Button>
    </Link>
  );
}

function PageSizeSelect({
  pageSize,
  onPageSizeChange,
}: {
  pageSize: number;
  onPageSizeChange: (size: number) => void;
}) {
  return (
    <Select
      value={String(pageSize)}
      onValueChange={(val) => onPageSizeChange(Number(val ?? pageSize))}
    >
      <SelectTrigger className="hidden sm:flex">
        <SelectValue className="text-sm" />
      </SelectTrigger>
      <SelectContent position="popper" align="start">
        {LIST_PAGE_SIZE_OPTIONS.map((s) => (
          <SelectItem key={s} value={String(s)} className="text-sm">
            {s}条/页
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function buildPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [];
  pages.push(1);
  if (current > 3) pages.push("...");
  for (
    let p = Math.max(2, current - 1);
    p <= Math.min(total - 1, current + 1);
    p++
  ) {
    pages.push(p);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}
