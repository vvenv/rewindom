import { api } from "@rewindom/module-sdk/client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type {
  BookmarkHostsResult,
  BookmarkListResult,
} from "../../shared/index.js";

const BOOKMARKS_KEY = ["bookmarks"] as const;

export interface UseBookmarksParams {
  page?: number;
  pageSize?: number;
  q?: string;
  host?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export function useBookmarks({
  page,
  pageSize,
  q,
  host,
  sortBy,
  sortDir,
}: UseBookmarksParams = {}) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryKey: [...BOOKMARKS_KEY, page, pageSize, q, host, sortBy, sortDir],
    queryFn: () => {
      const params: Record<string, number | string> = {};
      if (page !== undefined) params.page = page;
      if (pageSize !== undefined) params.page_size = pageSize;
      if (q) params.q = q;
      if (host) params.host = host;
      if (sortBy?.trim()) params.sort_by = sortBy;
      if (sortDir) params.sort_dir = sortDir;
      return api.get<BookmarkListResult>("/bookmarks", params);
    },
  });
}

/** 筛选栏的站点分组。与列表分开查，翻页 / 搜索时不必重算。 */
export function useBookmarkHosts() {
  return useQuery({
    queryKey: [...BOOKMARKS_KEY, "hosts"],
    queryFn: () => api.get<BookmarkHostsResult>("/bookmarks/hosts"),
  });
}
