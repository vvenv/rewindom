import { api } from "@rewindom/client-kit";
import { useQuery } from "@tanstack/react-query";


import type { SlowQueryStats } from "../../shared/index.js";

export function usePlatformSlowQueryStats(opts?: {
  startDate?: string;
  endDate?: string;
  tenantSlug?: string;
}) {
  return useQuery({
    queryKey: ["platform", "slow-query-stats", opts],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (opts?.startDate) params.start_date = opts.startDate;
      if (opts?.endDate) params.end_date = opts.endDate;
      if (opts?.tenantSlug) params.tenant_slug = opts.tenantSlug;
      return api.get<SlowQueryStats>("/platform/slow-query-logs/stats", params);
    },
    refetchInterval: 60_000,
  });
}
