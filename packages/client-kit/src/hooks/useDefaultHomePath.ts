import { isPlatformAdminActor } from "@be-water/shared";

import { buildPlatformConsoleUrl } from "../lib/platform-console-url.js";

import { useAuth } from "./useAuth.js";
import { usePublicConfig } from "./usePublicConfig.js";

export { PLATFORM_HOME_PATH } from "../lib/platform-console-url.js";

/**
 * 租户控制台的稳定入口：`AppHomeRedirect` 再按 `HOME_PATH_CANDIDATES`
 * 解析出真实首页（be-water 默认 `/dashboard`）。
 */
export const APP_HOME_ENTRY_PATH = "/app";

/**
 * 「回当前身份的默认首页」——守卫拒绝访问时的去处：
 * 平台管理员回平台控制台（可能是跨 Host 的 `PLATFORM_URL`），
 * 租户用户回租户工作台。
 *
 * 不要写死 `/`：那是官网落地页，会把已登录用户整个弹出控制台。
 * 也不要写死 `/dashboard`：默认首页由组装层的 `HOME_PATH_CANDIDATES` 决定，
 * 产品仓换首页时不该来改守卫。
 */
export function useDefaultHomePath(): string {
  const { user } = useAuth();
  const {
    data: { platform_url },
  } = usePublicConfig();

  return user && isPlatformAdminActor(user.actor_type)
    ? buildPlatformConsoleUrl(platform_url)
    : APP_HOME_ENTRY_PATH;
}
