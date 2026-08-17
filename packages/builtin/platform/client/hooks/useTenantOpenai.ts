import { api } from "@rewindom/client-kit";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { TenantLlmStatus, TenantLlmWriteBody } from "@rewindom/shared";

export const TENANT_OPENAI_KEY = ["settings", "openai"] as const;

export function useTenantOpenai() {
  return useQuery({
    queryKey: [...TENANT_OPENAI_KEY],
    queryFn: () => api.get<TenantLlmStatus>("/settings/openai"),
  });
}

export function useUpdateTenantOpenai() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TenantLlmWriteBody) =>
      api.put<TenantLlmStatus>("/settings/openai", body),
    onSuccess: (status) => {
      queryClient.setQueryData([...TENANT_OPENAI_KEY], status);
    },
  });
}
