/** 会员自己看到的账户信息（站点前台「我的账户」）。 */
export interface SiteMemberProfile {
  id: string;
  email: string;
  display_name: string;
  email_verified: boolean;
  created_at: string;
  last_login_at: string | null;
}

/** 管理面列表项（站点运营者看到的会员）。 */
export interface SiteMemberListItem {
  id: string;
  email: string;
  display_name: string;
  email_verified: boolean;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  locked_until: string | null;
}

/** 站点前台据此决定是否渲染会员入口（未绑定域名 / 未开通都为 false）。 */
export interface SiteMemberConfig {
  enabled: boolean;
  /** 平台开启滑块验证码时，登录/注册须先完成 `/api/captcha`。 */
  captcha_enabled: boolean;
  github_oauth_enabled: boolean;
  google_oauth_enabled: boolean;
  microsoft_oauth_enabled: boolean;
}

/** 与工作台 LoginCredentials.captcha 同形，走内核 CaptchaService。 */
export interface SiteMemberCaptchaInput {
  id: string;
  token: string;
  x: number;
  y: number;
}

/** 登录/注册成功后的会话；JWT 只在 HttpOnly cookie 里，不进 JSON。 */
export interface SiteMemberSession {
  member: SiteMemberProfile;
  expires_in: number;
}

export interface SiteMemberRegisterBody {
  email: string;
  password: string;
  display_name?: string;
  captcha?: SiteMemberCaptchaInput | null;
}

export interface SiteMemberLoginBody {
  email: string;
  password: string;
  captcha?: SiteMemberCaptchaInput | null;
}

export interface SiteMemberUpdateProfileBody {
  display_name?: string;
}

export interface SiteMemberChangePasswordBody {
  old_password: string;
  new_password: string;
}

export interface SiteMemberUpdateBody {
  enabled?: boolean;
  display_name?: string;
}

export interface SiteMemberResetPasswordResult {
  password: string;
}

export const SITE_MEMBER_SORTABLE_FIELDS = [
  "email",
  "display_name",
  "created_at",
  "updated_at",
  "last_login_at",
] as const;

export type SiteMemberSortField = (typeof SITE_MEMBER_SORTABLE_FIELDS)[number];
