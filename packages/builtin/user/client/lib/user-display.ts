import {
  isPlatformAdminActor,
  TENANT_IMPERSONATION_USERNAME,
  type User,
} from "@rewindom/shared";

import type { ImpersonationMeta } from "../../../platform/client/lib/impersonation-storage.js";
import type { TFunction } from "i18next";


export interface UserDisplayProfile {
  displayName: string;
  subtitle: string;
  avatarSeed: string;
  initials: string;
  showSuperuserShield: boolean;
  showLastLogin: boolean;
}

function getUserSubtitle(user: User, t: TFunction): string {
  if (isPlatformAdminActor(user.actor_type)) {
    return user.is_system_admin
      ? t("profile.platformSystemAdmin")
      : t("profile.platformAdmin");
  }
  if (user.is_system_admin) {
    return t("profile.tenantSystemAdmin");
  }
  return t("profile.tenantUser");
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
  t: TFunction,
): UserDisplayProfile {
  if (user.username === TENANT_IMPERSONATION_USERNAME && impersonationMeta) {
    const { tenant_name: tenantName, tenant_slug: tenantSlug } =
      impersonationMeta;
    return {
      displayName: tenantName,
      subtitle: t("profile.impersonationSubtitle"),
      avatarSeed: tenantSlug,
      initials: toInitials(tenantName),
      showSuperuserShield: false,
      showLastLogin: false,
    };
  }

  return {
    displayName: user.username,
    subtitle: getUserSubtitle(user, t),
    avatarSeed: user.username,
    initials: toInitials(user.username),
    showSuperuserShield: user.is_system_admin,
    showLastLogin: true,
  };
}
