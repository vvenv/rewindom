import { api } from "@rewindom/module-sdk/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { NEWSLETTER_KEY } from "./useNewsletter.js";

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [...NEWSLETTER_KEY] });
}

export function useDeleteSubscriber() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (subscriberId: string) =>
      api.delete<{ deleted: boolean }>(`/newsletter/${subscriberId}`),
    onSuccess: invalidate,
  });
}

export function useReactivateSubscriber() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (subscriberId: string) =>
      api.post<{ reactivated: boolean }>(
        `/newsletter/${subscriberId}/reactivate`,
        {},
      ),
    onSuccess: invalidate,
  });
}

export function useRunDigests() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: () =>
      api.post<{ groups: number; sent: number; skipped: number }>(
        "/newsletter/runs",
        {},
      ),
    onSuccess: invalidate,
  });
}
