import { api } from "@be-water/module-sdk/client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";


import type { NoteListItem } from "../../shared/index.js";

const NOTES_KEY = ["notes"] as const;

export function useNotes(
  page?: number,
  pageSize?: number,
  q?: string,
  sortBy?: string,
  sortDir?: "asc" | "desc",
) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryKey: [...NOTES_KEY, page, pageSize, q, sortBy, sortDir],
    queryFn: () => {
      const params: Record<string, number | string> = {};
      if (page !== undefined) params.page = page;
      if (pageSize !== undefined) params.page_size = pageSize;
      if (q) params.q = q;
      if (sortBy?.trim()) params.sort_by = sortBy;
      if (sortDir) params.sort_dir = sortDir;
      return api.get<{
        items: NoteListItem[];
        page: number;
        page_size: number;
        total: number;
        page_count: number;
      }>("/notes", params);
    },
  });
}
