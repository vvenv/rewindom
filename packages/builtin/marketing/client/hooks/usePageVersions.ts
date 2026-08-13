import { api } from "@rewindom/client-kit";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { SITE_QUERY_KEY } from "../lib/site-api.js";

export interface PageVersionListItem {
  id: string;
  version: number;
  title: string;
  description: string;
  section_count: number;
  created_by: string;
  created_at: string;
}

export const PAGE_VERSIONS_QUERY_KEY = ["site", "page-versions"] as const;

export function usePageVersions(pageId: string | undefined, enabled = true) {
  return useQuery({
    enabled: Boolean(pageId) && enabled,
    queryKey: [...PAGE_VERSIONS_QUERY_KEY, pageId],
    queryFn: () =>
      api.get<PageVersionListItem[]>(`/site/pages/${pageId}/versions`),
  });
}

export function useRestorePageVersion(pageId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (version: number) =>
      api.post<{ restored: boolean }>(
        `/site/pages/${pageId}/versions/${version}/restore`,
        {},
      ),
    // 恢复写的是草稿列，所以要作废站点内容缓存让编辑器重新拉一份
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SITE_QUERY_KEY }),
  });
}
