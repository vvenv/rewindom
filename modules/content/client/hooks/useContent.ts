import { api } from "@rewindom/module-sdk/client";
import { useQuery } from "@tanstack/react-query";

import type { Content } from "../../shared/index.js";

export function useContent(contentId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["contents", contentId],
    queryFn: () => api.get<Content>(`/contents/${contentId}`),
    enabled: enabled && Boolean(contentId),
    refetchInterval: (query) =>
      query.state.data?.status === "generating" ? 2000 : false,
  });
}
