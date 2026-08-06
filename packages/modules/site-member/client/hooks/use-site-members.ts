import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteSiteMember,
  listSiteMembers,
  resetSiteMemberPassword,
  updateSiteMember,
} from "../lib/site-member-admin-api.js";

import type { SiteMemberUpdateBody } from "../../shared/site-member.js";

const SITE_MEMBERS_KEY = ["site-members"] as const;

export function useSiteMembers(
  page?: number,
  pageSize?: number,
  q?: string,
  sortBy?: string,
  sortDir?: "asc" | "desc",
) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryKey: [...SITE_MEMBERS_KEY, page, pageSize, q, sortBy, sortDir],
    queryFn: () =>
      listSiteMembers({
        page,
        page_size: pageSize,
        q: q || undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
      }),
  });
}

export function useUpdateSiteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: SiteMemberUpdateBody & { id: string }) => updateSiteMember(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SITE_MEMBERS_KEY });
    },
  });
}

export function useResetSiteMemberPassword() {
  return useMutation({
    mutationFn: (memberId: string) => resetSiteMemberPassword(memberId),
  });
}

export function useDeleteSiteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => deleteSiteMember(memberId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SITE_MEMBERS_KEY });
    },
  });
}
