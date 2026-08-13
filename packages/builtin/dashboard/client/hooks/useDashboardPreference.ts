import { api } from "@rewindom/client-kit";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createEmptyDashboardPreference,
  type DashboardPreference,
  type UpdateDashboardPreferenceInput,
} from "../../shared/index.js";

export const DASHBOARD_PREFERENCE_KEY = ["dashboard", "preference"] as const;

/**
 * 当前用户的工作台布局。
 *
 * `staleTime: Infinity`：这份数据只会被本人在配置面板里改，改完直接写回缓存，
 * 没有别处会让它过期；工作台是落地页，不该每次进来都多一个请求的等待。
 */
export function useDashboardPreference() {
  return useQuery({
    queryKey: DASHBOARD_PREFERENCE_KEY,
    queryFn: () => api.get<DashboardPreference>("/dashboard/preferences"),
    staleTime: Infinity,
  });
}

export function useSaveDashboardPreference() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateDashboardPreferenceInput) =>
      api.put<DashboardPreference>("/dashboard/preferences", input),
    onSuccess: (preference) => {
      qc.setQueryData(DASHBOARD_PREFERENCE_KEY, preference);
    },
  });
}

/** 恢复默认布局：服务端删行，本地缓存同步回空偏好。 */
export function useResetDashboardPreference() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete<DashboardPreference>("/dashboard/preferences"),
    onSuccess: () => {
      qc.setQueryData(
        DASHBOARD_PREFERENCE_KEY,
        createEmptyDashboardPreference(),
      );
    },
  });
}
