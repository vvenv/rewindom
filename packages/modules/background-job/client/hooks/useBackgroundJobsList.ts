import { api, useTenantQueryScope  } from "@be-water/client-kit";
import { useQuery } from "@tanstack/react-query";


import type { BackgroundJobDto } from "../../shared/index.js";

export const BACKGROUND_JOBS_KEY = ["background-jobs"] as const;
export const PLATFORM_BACKGROUND_JOBS_KEY = ["platform", "background-jobs"] as const;

export function getBackgroundJobsQueryKey(
  isPlatformAdmin: boolean,
  tenantScope: string | null,
): readonly string[] {
  return isPlatformAdmin
    ? [...PLATFORM_BACKGROUND_JOBS_KEY]
    : [...BACKGROUND_JOBS_KEY, tenantScope ?? ""];
}

export function fetchBackgroundJobsList(
  isPlatformAdmin: boolean,
): Promise<BackgroundJobDto[]> {
  return api.get<BackgroundJobDto[]>(
    isPlatformAdmin ? "/platform/background-jobs" : "/background-jobs",
  );
}

export function useBackgroundJobsList(options: {
  enabled?: boolean;
  isPlatformAdmin: boolean;
}) {
  const tenantScope = useTenantQueryScope();
  const enabled =
    (options.enabled ?? true) &&
    (options.isPlatformAdmin || tenantScope !== null);

  return useQuery({
    queryKey: getBackgroundJobsQueryKey(options.isPlatformAdmin, tenantScope),
    queryFn: () => fetchBackgroundJobsList(options.isPlatformAdmin),
    enabled,
  });
}
