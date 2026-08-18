import { api } from "@rewindom/client-kit";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { isSiteAssetFile, type SiteAsset } from "../../shared/site-asset.js";
import { partitionSiteAssetFiles } from "../lib/site-asset-files.js";

export const SITE_ASSETS_QUERY_KEY = ["site", "assets"] as const;

export type { SiteAsset };

export interface SiteAssetUploadResult {
  uploaded: SiteAsset[];
  failed: File[];
  rejected: File[];
}

export function useSiteAssets(enabled = true) {
  return useQuery({
    enabled,
    queryKey: SITE_ASSETS_QUERY_KEY,
    queryFn: () => api.get<SiteAsset[]>("/site/assets"),
  });
}

function invalidateAssets(queryClient: ReturnType<typeof useQueryClient>): void {
  void queryClient.invalidateQueries({ queryKey: SITE_ASSETS_QUERY_KEY });
}

export function useUploadSiteAssets() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (files: File[]): Promise<SiteAssetUploadResult> => {
      const { accepted, rejected } = partitionSiteAssetFiles(files);
      const uploaded: SiteAsset[] = [];
      const failed: File[] = [];
      for (const file of accepted) {
        try {
          const formData = new FormData();
          formData.append("file", file);
          uploaded.push(await api.upload<SiteAsset>("/site/assets", formData));
        } catch {
          failed.push(file);
        }
      }
      return { uploaded, failed, rejected };
    },
    onSuccess: (result) => {
      if (result.uploaded.length > 0) invalidateAssets(queryClient);
    },
  });
}

export function useReplaceSiteAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      if (!isSiteAssetFile(file)) {
        throw new Error("unsupported");
      }
      const formData = new FormData();
      formData.append("file", file);
      return api.upload<SiteAsset>(`/site/assets/${id}/replace`, formData);
    },
    onSuccess: () => invalidateAssets(queryClient),
  });
}

export function useUpdateSiteAssetAlt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, alt }: { id: string; alt: string }) =>
      api.patch<SiteAsset>(`/site/assets/${id}`, { alt }),
    onSuccess: () => invalidateAssets(queryClient),
  });
}

export function useDeleteSiteAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ deleted: boolean }>(`/site/assets/${id}`),
    onSuccess: () => invalidateAssets(queryClient),
  });
}
