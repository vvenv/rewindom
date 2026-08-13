import { api } from "@rewindom/client-kit";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  SiteRedirect,
  SiteRedirectBody,
} from "../../shared/site-redirect.js";

export const SITE_REDIRECTS_QUERY_KEY = ["site", "redirects"] as const;

export function useSiteRedirects() {
  return useQuery({
    queryKey: SITE_REDIRECTS_QUERY_KEY,
    queryFn: () => api.get<SiteRedirect[]>("/site/redirects"),
  });
}

export function useSaveSiteRedirect() {
  const queryClient = useQueryClient();
  return useMutation({
    // 按 from_path upsert：同一个源只该有一条规则，重复添加即改目标
    mutationFn: (body: SiteRedirectBody) =>
      api.put<SiteRedirect>("/site/redirects", body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: SITE_REDIRECTS_QUERY_KEY }),
  });
}

export function useDeleteSiteRedirect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ deleted: boolean }>(`/site/redirects/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: SITE_REDIRECTS_QUERY_KEY }),
  });
}
