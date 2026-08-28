import { api } from "@rewindom/module-sdk/client";
import { useQuery } from "@tanstack/react-query";

import type { ThingPreviewResponse } from "../../shared/index.js";

/** 只在预览打开时才拉——渲染整页不便宜，不该跟着列表一起发。 */
export function useThingPreview(thingId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["things", thingId, "preview"],
    queryFn: () => api.get<ThingPreviewResponse>(`/things/${thingId}/preview`),
    enabled: enabled && Boolean(thingId),
    // 预览是「此刻它长什么样」，关掉再开就该重新渲染
    staleTime: 0,
    gcTime: 0,
  });
}
