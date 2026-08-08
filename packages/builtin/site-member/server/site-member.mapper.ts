import type {
  SiteMemberListItem,
  SiteMemberProfile,
} from "../shared/site-member.js";

interface SiteMemberRow {
  id: string;
  email: string;
  display_name: string;
  email_verified_at: Date | null;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
  locked_until: Date | null;
}

/** 会员自己可见的字段：不含 enabled / 锁定状态等运营信息。 */
export function toSiteMemberProfile(row: SiteMemberRow): SiteMemberProfile {
  return {
    id: row.id,
    email: row.email,
    display_name: row.display_name,
    email_verified: row.email_verified_at !== null,
    created_at: row.created_at.toISOString(),
    last_login_at: row.last_login_at?.toISOString() ?? null,
  };
}

export function toSiteMemberListItem(row: SiteMemberRow): SiteMemberListItem {
  return {
    id: row.id,
    email: row.email,
    display_name: row.display_name,
    email_verified: row.email_verified_at !== null,
    enabled: row.enabled,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
    last_login_at: row.last_login_at?.toISOString() ?? null,
    locked_until: row.locked_until?.toISOString() ?? null,
  };
}
