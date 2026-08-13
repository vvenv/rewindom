import { api } from "@rewindom/module-sdk/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  Bookmark,
  CreateBookmarkBody,
  UpdateBookmarkBody,
} from "../../shared/index.js";

export function useCreateBookmark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateBookmarkBody) =>
      api.post<Bookmark>("/bookmarks", body),
    onSuccess: async () => {
      // ["bookmarks"] 前缀同时覆盖列表与站点分组——新站点要立刻出现在筛选栏里。
      await queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });
}

export function useUpdateBookmark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateBookmarkBody & { id: string }) =>
      api.patch<Bookmark>(`/bookmarks/${id}`, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });
}

export function useDeleteBookmark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ deleted: boolean }>(`/bookmarks/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });
}
