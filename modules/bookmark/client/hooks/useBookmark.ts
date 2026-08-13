import { api } from "@rewindom/module-sdk/client";
import { useQuery } from "@tanstack/react-query";

import type { Bookmark } from "../../shared/index.js";

export function useBookmark(bookmarkId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["bookmarks", bookmarkId],
    queryFn: () => api.get<Bookmark>(`/bookmarks/${bookmarkId}`),
    enabled: enabled && Boolean(bookmarkId),
  });
}
