import { isPlatformAdminActor, type AuthActorType } from "./auth-actor.js";
import { isReservedTenantUsername } from "./tenant-internal.js";

import type { AppLocale } from "./locale.js";

export interface User {
  id: string;
  username: string;
  actor_type: AuthActorType;
  is_system_admin: boolean;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  last_access_at: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
  captcha?: {
    id: string;
    token: string;
    x: number;
    y: number;
  } | null;
}

export interface ChangePasswordData {
  oldPassword: string;
  newPassword: string;
}

export interface CaptchaChallenge {
  id: string;
  token: string;
  expiresAt: string;
  targetX: number;
  targetY: number;
}

export interface CaptchaVerifyInput {
  id: string;
  token: string;
  x: number;
  y: number;
}

/** 租户自助注册入参（壳层注册页提交，平台侧 tenant-registration 消费）。 */
export interface RegisterTenantInput {
  tenant_name: string;
  tenant_slug: string;
  username: string;
  password: string;
  phone: string;
  email: string;
  captcha_token?: string;
}

export interface RoleSummary {
  id: string;
  name: string;
  description: string | null;
  scope: "tenant" | "platform";
  is_builtin: boolean;
}

/**
 * `GET /roles` 的单条形态——比 {@link RoleSummary} 多出权限清单与时间戳。
 * 服务端 `RoleService.RoleDto` 的 JSON 投影（`Date` 序列化为 ISO 字符串）。
 */
export interface RoleDetail extends RoleSummary {
  permissions: string[];
  created_at: string;
  updated_at: string;
}

export interface TenantUserListItem {
  id: string;
  username: string;
  is_system_admin: boolean;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  last_access_at: string | null;
  failed_login_attempts: number;
  locked_until: string | null;
  roles: RoleSummary[];
}

/**
 * 是否为普通租户用户（排除平台管理员、保留用户名、模拟登录态）。
 */
export function isRegularUser(
  user: { username: string; actor_type: AuthActorType },
  isImpersonation = false,
): boolean {
  if (isImpersonation) return false;
  if (isPlatformAdminActor(user.actor_type)) return false;
  if (isReservedTenantUsername(user.username)) return false;
  return true;
}

/** 公开配置（未登录可读）：自助注册是否开放、是否启用验证码、平台默认语言。 */
export interface PublicConfig {
  registration_enabled: boolean;
  captcha_enabled: boolean;
  /** 平台默认界面语言；登录页 / 未进租户壳时作为服务端默认。 */
  default_locale: AppLocale;
  /** 是否已配置 GitHub OAuth（登录页展示「使用 GitHub 登录」）。 */
  github_oauth_enabled: boolean;
  /** 是否已配置 Google OAuth（登录页展示「使用 Google 登录」）。 */
  google_oauth_enabled: boolean;
}
