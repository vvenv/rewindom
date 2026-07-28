import { useCallback } from "react";

import {
  applyFiltersToSearchParams,
  parseListPage,
  parseListPageSize,
} from "@be-water/client-kit/lib/list-url-params";
import { useSearchParams } from "react-router";

import {
  parseTodoStatus,
  TODO_STATUS_ALL,
  todoStatusToCompleted,
  type TodoStatusFilter,
} from "../lib/todos.js";

export function useTodosPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get("q") || undefined;
  const status = parseTodoStatus(searchParams.get("status"));
  const page = parseListPage(searchParams.get("page"));
  const pageSize = parseListPageSize(searchParams.get("page_size"));

  const handleFiltersChange = useCallback(
    (filters: { q?: string; status?: TodoStatusFilter }) => {
      setSearchParams(
        applyFiltersToSearchParams(searchParams, {
          q: filters.q,
          // all 是默认态，不写进 URL，保持链接干净
          status:
            filters.status && filters.status !== TODO_STATUS_ALL
              ? filters.status
              : undefined,
        }),
      );
    },
    [searchParams, setSearchParams],
  );

  return {
    q,
    status,
    completed: todoStatusToCompleted(status),
    page,
    pageSize,
    handleFiltersChange,
  };
}
