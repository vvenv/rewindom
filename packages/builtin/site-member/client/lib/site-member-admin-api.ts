import { api } from "@rewindom/client-kit";

import type {
  SiteMemberListItem,
  SiteMemberResetPasswordResult,
  SiteMemberUpdateBody,
} from "../../shared/site-member.js";

export interface SiteMemberListResult {
  items: SiteMemberListItem[];
  page: number;
  page_size: number;
  total: number;
  page_count: number;
}

export function listSiteMembers(params: {
  page?: number;
  page_size?: number;
  q?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}): Promise<SiteMemberListResult> {
  return api.get<SiteMemberListResult>("/site-members", params);
}

export function updateSiteMember(
  memberId: string,
  body: SiteMemberUpdateBody,
): Promise<SiteMemberListItem> {
  return api.patch<SiteMemberListItem>(`/site-members/${memberId}`, body);
}

export function resetSiteMemberPassword(
  memberId: string,
): Promise<SiteMemberResetPasswordResult> {
  return api.post<SiteMemberResetPasswordResult>(
    `/site-members/${memberId}/reset-password`,
    {},
  );
}

export function deleteSiteMember(
  memberId: string,
): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`/site-members/${memberId}`);
}
