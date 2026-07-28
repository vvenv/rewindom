import { api } from "@be-water/client-kit";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { TodoListItem } from "../../shared/index.js";

const TODOS_KEY = ["todos"] as const;

export interface TodosListResponse {
  items: TodoListItem[];
  page: number;
  page_size: number;
  total: number;
  page_count: number;
  /** 跨分页、不受筛选影响的完成态计数，页脚用 */
  active_count: number;
  completed_count: number;
}

export function useTodos(
  page?: number,
  pageSize?: number,
  q?: string,
  completed?: boolean,
) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryKey: [...TODOS_KEY, page, pageSize, q, completed],
    queryFn: () => {
      const params: Record<string, number | string> = {};
      if (page !== undefined) params.page = page;
      if (pageSize !== undefined) params.page_size = pageSize;
      if (q) params.q = q;
      if (completed !== undefined) params.completed = String(completed);
      return api.get<TodosListResponse>("/todos", params);
    },
  });
}
