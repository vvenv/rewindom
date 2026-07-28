import { api } from "@be-water/client-kit";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { TodoListItem } from "../../shared/index.js";

const TODOS_KEY = ["todos"] as const;

export function useTodos(
  page?: number,
  pageSize?: number,
  q?: string,
  completed?: boolean,
  sortBy?: string,
  sortDir?: "asc" | "desc",
) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryKey: [...TODOS_KEY, page, pageSize, q, completed, sortBy, sortDir],
    queryFn: () => {
      const params: Record<string, number | string> = {};
      if (page !== undefined) params.page = page;
      if (pageSize !== undefined) params.page_size = pageSize;
      if (q) params.q = q;
      if (completed !== undefined) params.completed = String(completed);
      if (sortBy?.trim()) params.sort_by = sortBy;
      if (sortDir) params.sort_dir = sortDir;
      return api.get<{
        items: TodoListItem[];
        page: number;
        page_size: number;
        total: number;
        page_count: number;
      }>("/todos", params);
    },
  });
}
