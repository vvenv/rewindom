import {
  TENANT_BRANDING_QUERY_KEY,
  api,
} from "@be-water/client-kit";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { TenantBrandingUrls } from "@be-water/shared";

export type BrandingAssetKind = "logo" | "favicon";

export function useUploadTenantBranding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { kind: BrandingAssetKind; file: File }) => {
      const formData = new FormData();
      formData.append("file", input.file);
      return api.upload<TenantBrandingUrls>(
        `/settings/branding/${input.kind}`,
        formData,
      );
    },
    onSuccess: (data) => {
      queryClient.setQueryData(TENANT_BRANDING_QUERY_KEY, data);
    },
  });
}

export function useClearTenantBranding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (kind: BrandingAssetKind) =>
      api.delete<TenantBrandingUrls>(`/settings/branding/${kind}`),
    onSuccess: (data) => {
      queryClient.setQueryData(TENANT_BRANDING_QUERY_KEY, data);
    },
  });
}
