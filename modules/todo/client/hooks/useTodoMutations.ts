import { api } from "@rewindom/module-sdk/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  CreateTodoBody,
  Todo,
  UpdateTodoBody,
} from "../../shared/index.js";

export function useCreateTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTodoBody) => api.post<Todo>("/todos", body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });
}

export function useUpdateTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateTodoBody & { id: string }) =>
      api.patch<Todo>(`/todos/${id}`, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });
}

export function useDeleteTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ deleted: boolean }>(`/todos/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });
}

export function useToggleAllTodos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (completed: boolean) =>
      api.post<{ updated: number }>("/todos/toggle-all", { completed }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });
}

export function useClearCompletedTodos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete<{ deleted: number }>("/todos/completed"),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });
}
