import { useRef, type KeyboardEvent } from "react";


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
  compact?: boolean;
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
  compact = false,
  pageParam = "page",
  pageSizeParam = "page_size",
}: PaginationProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const jumpRef = useRef<HTMLInputElement>(null);

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

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground flex-wrap">
        <span className="shrink-0 text-sm">共 {total} 条</span>
        <PageSizeSelect
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
        />
        <div className="flex items-center gap-0.5">
          <Link
            to={{
              search: canPrev
                ? buildUrl(currentPage - 1)
                : searchParams.toString(),
            }}
            className="inline-flex"
          >
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={!canPrev}
              aria-label="上一页"
            >
              <ChevronLeft className="size-3.5" />
            </Button>
          </Link>
          <span className="px-2 text-muted-foreground text-sm">
            {currentPage} / {pageCount}
          </span>
          <Link
            to={{
              search: canNext
                ? buildUrl(currentPage + 1)
                : searchParams.toString(),
            }}
            className="inline-flex"
          >
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={!canNext}
              aria-label="下一页"
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </Link>
        </div>
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
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-muted-foreground flex-wrap">
      <span className="shrink-0 text-sm">共 {total} 条</span>

      <PageSizeSelect
        pageSize={pageSize}
        onPageSizeChange={handlePageSizeChange}
      />

      <div className="flex items-center gap-0.5">
        <Link
          to={{
            search: canPrev
              ? buildUrl(currentPage - 1)
              : searchParams.toString(),
          }}
          className="inline-flex"
        >
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!canPrev}
            aria-label="上一页"
          >
            <ChevronLeft className="size-3.5" />
          </Button>
        </Link>
        <div className="hidden sm:flex items-center gap-0.5">
          {pages.map((p, i) =>
            p === "..." ? (
              <span key={`ellipsis-${i}`} className="px-1 text-sm">
                …
              </span>
            ) : (
              <Link
                key={p}
                to={{ search: buildUrl(p as number) }}
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
        <span className="sm:hidden px-2 text-muted-foreground text-sm">
          {currentPage} / {pageCount}
        </span>
        <Link
          to={{
            search: canNext
              ? buildUrl(currentPage + 1)
              : searchParams.toString(),
          }}
          className="inline-flex"
        >
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!canNext}
            aria-label="下一页"
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </Link>
      </div>

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
    </div>
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
  const c = current + 1;
  pages.push(1);
  if (c > 3) pages.push("...");
  for (let p = Math.max(2, c - 1); p <= Math.min(total - 1, c + 1); p++) {
    pages.push(p);
  }
  if (c < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}
