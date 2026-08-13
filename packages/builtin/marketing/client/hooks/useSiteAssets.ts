import { api } from "@rewindom/client-kit";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { SiteAsset } from "../../shared/site-asset.js";

export const SITE_ASSETS_QUERY_KEY = ["site", "assets"] as const;

export type { SiteAsset };

export function useSiteAssets(enabled = true) {
  return useQuery({
    enabled,
    queryKey: SITE_ASSETS_QUERY_KEY,
    queryFn: () => api.get<SiteAsset[]>("/site/assets"),
  });
}

export function useUploadSiteAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.upload<SiteAsset>("/site/assets", formData);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: SITE_ASSETS_QUERY_KEY }),
  });
}

export function useUpdateSiteAssetAlt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, alt }: { id: string; alt: string }) =>
      api.patch<SiteAsset>(`/site/assets/${id}`, { alt }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: SITE_ASSETS_QUERY_KEY }),
  });
}

export function useDeleteSiteAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ deleted: boolean }>(`/site/assets/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: SITE_ASSETS_QUERY_KEY }),
  });
}
