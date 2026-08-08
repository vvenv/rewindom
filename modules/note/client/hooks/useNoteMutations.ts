import { api } from "@be-water/module-sdk/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";


import type { CreateNoteBody, Note, UpdateNoteBody } from "../../shared/index.js";

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateNoteBody) =>
      api.post<Note>("/notes", body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateNoteBody & { id: string }) =>
      api.patch<Note>(`/notes/${id}`, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ deleted: boolean }>(`/notes/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}
