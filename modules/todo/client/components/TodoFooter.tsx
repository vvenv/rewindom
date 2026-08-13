import { DebouncedSearchInput, Pagination } from "@rewindom/module-sdk/client";
import { Button } from "@rewindom/ui/button";
import { useTranslation } from "react-i18next";

import {
  TODO_STATUS_ALL,
  TODO_STATUS_FILTER_OPTIONS,
  type TodoStatusFilter,
} from "../lib/todos.js";

interface TodoFooterProps {
  activeCount: number;
  completedCount: number;
  q?: string;
  status: TodoStatusFilter;
  canWrite: boolean;
  isClearing: boolean;
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  onFiltersChange: (filters: { q?: string; status?: TodoStatusFilter }) => void;
  onClearCompleted: () => void;
}

/**
 * 列表页脚：剩余条数 + 三段筛选 + 清除已完成，都是待办清单的常规控件。
 * 「清除已完成」只在真有已完成项时出现——没得清的时候摆一个按钮只会让人误点。
 */
export function TodoFooter({
  activeCount,
  completedCount,
  q,
  status,
  canWrite,
  isClearing,
  page,
  pageSize,
  total,
  pageCount,
  onFiltersChange,
  onClearCompleted,
}: TodoFooterProps) {
  const { t } = useTranslation("todo");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">
          {t("remainingCount", { count: activeCount })}
        </span>

        <div className="flex flex-wrap items-center gap-2">
          {TODO_STATUS_FILTER_OPTIONS.map((option) => {
            const selected = option.value === status;
            return (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={
                  selected
                    ? option.value === TODO_STATUS_ALL
                      ? "secondary"
                      : "default"
                    : "ghost"
                }
                onClick={() => onFiltersChange({ q, status: option.value })}
              >
                {t(option.labelKey)}
              </Button>
            );
          })}

          <DebouncedSearchInput
            value={q}
            placeholder={t("searchPlaceholder")}
            className="h-8 max-w-44"
            onCommit={(value) =>
              onFiltersChange({ q: value.trim() || undefined, status })
            }
          />

          {canWrite && completedCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              disabled={isClearing}
              onClick={onClearCompleted}
            >
              {t("clearCompleted")}
            </Button>
          ) : null}
        </div>
      </div>

      {pageCount > 1 ? (
        <div className="flex justify-end">
          <Pagination
            currentPage={page}
            pageCount={pageCount}
            pageSize={pageSize}
            total={total}
            canPrev={page > 1}
            canNext={page < pageCount}
          />
        </div>
      ) : null}
    </div>
  );
}
