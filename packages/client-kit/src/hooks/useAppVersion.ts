import { useQuery } from "@tanstack/react-query";

import { api } from "../api.js";

import type { AppVersionInfo } from "../lib/environment.js";

const QUERY_KEY = ["system-info"] as const;

export function useAppVersion() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => api.get<AppVersionInfo>("/system-info", undefined, true),
    staleTime: 5 * 60 * 1000,
  });
}
