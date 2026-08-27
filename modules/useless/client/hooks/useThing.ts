import { api } from "@rewindom/module-sdk/client";
import { useQuery } from "@tanstack/react-query";

import type { Thing } from "../../shared/index.js";

export function useThing(thingId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["things", thingId],
    queryFn: () => api.get<Thing>(`/things/${thingId}`),
    enabled: enabled && Boolean(thingId),
  });
}
