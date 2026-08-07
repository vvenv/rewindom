import { STORAGE_PREFIX } from "./branding.js";

/**
 * 站点会员 HttpOnly cookie 名（Host-only，不设 Domain）。
 *
 * 与工作台 localStorage Bearer 会话隔离：同源可同时登录运营者与会员。
 */
export const MEMBER_ACCESS_COOKIE = `${STORAGE_PREFIX}_member_access`;
export const MEMBER_REFRESH_COOKIE = `${STORAGE_PREFIX}_member_refresh`;

/** 与 SiteMemberAuthService access TTL 一致（秒）。 */
export const MEMBER_ACCESS_COOKIE_MAX_AGE = 900;

/** refresh 7 天（秒）。 */
export const MEMBER_REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;
