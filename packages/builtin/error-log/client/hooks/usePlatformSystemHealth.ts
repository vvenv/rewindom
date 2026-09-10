import { api } from "@rewindom/client-kit";
import { useQuery } from "@tanstack/react-query";

import type { DependencyHealth } from "../../shared/index.js";

export function usePlatformSystemHealth() {
  return useQuery({
    queryKey: ["platform", "error-log-health"],
    queryFn: () => api.get<DependencyHealth>("/platform/error-logs/health"),
    refetchInterval: 15_000,
  });
}
