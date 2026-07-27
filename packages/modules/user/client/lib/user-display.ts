import { isPlatformAdminActor, TENANT_IMPERSONATION_USERNAME, type User  } from "@be-water/shared";

import type { ImpersonationMeta } from "../../../platform/client/lib/impersonation-storage.js";

export interface UserDisplayProfile {
  displayName: string;
  subtitle: string;
  avatarSeed: string;
  initials: string;
  showSuperuserShield: boolean;
  showLastLogin: boolean;
}

function getUserSubtitle(user: User): string {
  if (isPlatformAdminActor(user.actor_type)) {
    return user.is_system_admin ? "平台系统管理员" : "平台管理员";
  }
  if (user.is_system_admin) {
    return "租户系统管理员";
  }
  return "租户用户";
}

const CJK_CHAR_PATTERN =
  /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/u;

function toInitials(value: string): string {
  if (!value) return "";
  const first = [...value][0] ?? "";
  if (CJK_CHAR_PATTERN.test(first)) {
    return first;
  }
  return value.slice(0, 2).toUpperCase();
}

export function getUserDisplayProfile(
  user: User,
  impersonationMeta: ImpersonationMeta | null,
): UserDisplayProfile {
  if (user.username === TENANT_IMPERSONATION_USERNAME && impersonationMeta) {
    const { tenant_name: tenantName, tenant_slug: tenantSlug } =
      impersonationMeta;
    return {
      displayName: tenantName,
      subtitle: "平台代登录",
      avatarSeed: tenantSlug,
      initials: toInitials(tenantName),
      showSuperuserShield: false,
      showLastLogin: false,
    };
  }

  return {
    displayName: user.username,
    subtitle: getUserSubtitle(user),
    avatarSeed: user.username,
    initials: toInitials(user.username),
    showSuperuserShield: user.is_system_admin,
    showLastLogin: true,
  };
}
