import { api } from "@be-water/client-kit";
import { useQuery } from "@tanstack/react-query";


import type { Note } from "../../shared/index.js";

export function useNote(noteId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["notes", noteId],
    queryFn: () => api.get<Note>(`/notes/${noteId}`),
    enabled: enabled && Boolean(noteId),
  });
}
