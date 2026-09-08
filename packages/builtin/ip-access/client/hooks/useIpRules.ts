/**
 * 租户面与平台面共用同一套 hook，靠 `scope` 切 API 前缀。
 *
 * 两边的列表形态、筛选项、表格列完全一致，差别只在作用域和权限；
 * 复制两份必然会一边改了另一边忘。
 */
import { api } from "@rewindom/client-kit";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type {
  IpAccessRuleDto,
  IpAccessRuleWriteBody,
} from "../../shared/index.js";

export type IpRuleScope = "tenant" | "platform";

function basePath(scope: IpRuleScope): string {
  return scope === "platform" ? "/platform/ip-rules" : "/ip-rules";
}

function ruleKey(scope: IpRuleScope): readonly string[] {
  return ["ip-rules", scope];
}

export interface IpRuleListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  action?: string;
  source?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export interface IpRuleListResult {
  items: IpAccessRuleDto[];
  page: number;
  page_size: number;
  total: number;
  page_count: number;
}

export function useIpRules(scope: IpRuleScope, params: IpRuleListParams) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryKey: [
      ...ruleKey(scope),
      params.page,
      params.pageSize,
      params.q,
      params.action,
      params.source,
      params.sortBy,
      params.sortDir,
    ],
    queryFn: () => {
      const query: Record<string, number | string> = {};
      if (params.page !== undefined) query.page = params.page;
      if (params.pageSize !== undefined) query.page_size = params.pageSize;
      if (params.q) query.q = params.q;
      if (params.action) query.action = params.action;
      if (params.source) query.source = params.source;
      if (params.sortBy?.trim()) query.sort_by = params.sortBy;
      if (params.sortDir) query.sort_dir = params.sortDir;
      return api.get<IpRuleListResult>(basePath(scope), query);
    },
  });
}

export interface IpAccessStatus {
  enabled: boolean;
  always_allow: string[];
  auto_ban_minutes: number;
  login_failure_threshold: number;
  login_failure_window_minutes: number;
  cache: { loaded: boolean; rule_count: number; loaded_at: string | null };
}

/** 平台专用：判定的实际运行配置，排查「规则为什么没生效」的第一站。 */
export function useIpAccessStatus() {
  return useQuery({
    queryKey: ["ip-rules", "status"],
    queryFn: () => api.get<IpAccessStatus>("/platform/ip-rules/status"),
  });
}

export interface TrafficSource {
  ip: string;
  requests: number;
  errors: number;
  error_rate: number;
}

/**
 * 「谁在打我」。轮询而不是等用户手点刷新——这个面板是在出事时看的，
 * 数字停在两分钟前会让人误判。
 */
export function useTrafficSources(limit: number) {
  return useQuery({
    queryKey: ["ip-rules", "traffic", limit],
    queryFn: () =>
      api.get<{ window_minutes: number; items: TrafficSource[] }>(
        "/platform/ip-rules/traffic",
        { limit },
      ),
    refetchInterval: 30_000,
  });
}

export function useCreateIpRule(scope: IpRuleScope) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: IpAccessRuleWriteBody) =>
      api.post<IpAccessRuleDto>(basePath(scope), body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ruleKey(scope) });
    },
  });
}

export function useUpdateIpRule(scope: IpRuleScope) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      ruleId,
      body,
    }: {
      ruleId: string;
      body: Partial<IpAccessRuleWriteBody>;
    }) => api.patch<IpAccessRuleDto>(`${basePath(scope)}/${ruleId}`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ruleKey(scope) });
    },
  });
}

export function useDeleteIpRule(scope: IpRuleScope) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: string) =>
      api.delete<{ deleted: boolean }>(`${basePath(scope)}/${ruleId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ruleKey(scope) });
    },
  });
}

export function useExportEdgeBlocklist() {
  return useMutation({
    mutationFn: () =>
      api.post<{ path: string | null; count: number; skipped: boolean }>(
        "/platform/ip-rules/export",
        {},
      ),
  });
}
