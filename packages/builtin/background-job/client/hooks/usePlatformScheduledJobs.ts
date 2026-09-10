import { api } from "@rewindom/client-kit";
import { useQuery } from "@tanstack/react-query";

import type { ScheduledJobOverview } from "../../shared/scheduled-job.js";

/**
 * 轮询而不是等手点刷新：这个区块是在出事时看的，
 * 「上次运行」停在两分钟前会让人误判成任务卡死。
 */
export function usePlatformScheduledJobs() {
  return useQuery({
    queryKey: ["platform", "scheduled-jobs"],
    queryFn: () => api.get<ScheduledJobOverview>("/platform/scheduled-jobs"),
    refetchInterval: 30_000,
  });
}
