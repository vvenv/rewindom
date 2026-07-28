import { api } from "@be-water/client-kit";
import { useQuery } from "@tanstack/react-query";

import type { Todo } from "../../shared/index.js";

export function useTodo(todoId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["todos", todoId],
    queryFn: () => api.get<Todo>(`/todos/${todoId}`),
    enabled: enabled && Boolean(todoId),
  });
}
