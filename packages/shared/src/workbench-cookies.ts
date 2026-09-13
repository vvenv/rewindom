import { STORAGE_PREFIX } from "./branding.js";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
} from "./workbench-token-ttl.js";

/**
 * 工作台（租户用户 / 平台管理员）HttpOnly cookie 名（Host-only，不设 Domain）。
 *
 * 与站点会员 cookie 隔离：同源可同时登录运营者与会员。
 */
export const WORKBENCH_ACCESS_COOKIE = `${STORAGE_PREFIX}_access`;
export const WORKBENCH_REFRESH_COOKIE = `${STORAGE_PREFIX}_refresh`;

/**
 * 模拟登录前备份的平台会话（HttpOnly）。JS 读不到 access/refresh，
 * 退出模拟时靠服务端从本 cookie 恢复。
 */
export const WORKBENCH_IMPERSONATION_RETURN_COOKIE = `${STORAGE_PREFIX}_impersonation_return`;

/** 与 kernel `ACCESS_TOKEN_TTL_SECONDS` 一致（秒）。 */
export const WORKBENCH_ACCESS_COOKIE_MAX_AGE = ACCESS_TOKEN_TTL_SECONDS;

/** 与 kernel `REFRESH_TOKEN_TTL_SECONDS` 一致（秒）。 */
export const WORKBENCH_REFRESH_COOKIE_MAX_AGE = REFRESH_TOKEN_TTL_SECONDS;
