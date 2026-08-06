/** 平台控制台路径（相对当前 origin）。 */
export const PLATFORM_HOME_PATH = "/platform";

/**
 * 拼平台控制台入口。
 * - 有 `PLATFORM_URL` → 绝对 URL（跨 Host 回控制台）
 * - 否则 → 相对 `/platform`（同域兜底）
 */
export function buildPlatformConsoleUrl(
  platformUrl: string | null | undefined,
): string {
  const base = platformUrl?.trim().replace(/\/+$/u, "") ?? "";
  if (!base) return PLATFORM_HOME_PATH;
  return `${base}${PLATFORM_HOME_PATH}`;
}

/** 跳到平台控制台（支持跨 origin）。 */
export function goToPlatformConsole(
  platformUrl: string | null | undefined,
): void {
  window.location.assign(buildPlatformConsoleUrl(platformUrl));
}

/**
 * 当前 origin 是不是平台控制台。
 *
 * 「没绑定租户」不等于「这是控制台」——随便一个指到本服务的陌生 Host 同样没有租户，
 * 那种情况该照常显示站点不可用，而不是把控制台登录页递到陌生人面前。
 *
 * 没配 `PLATFORM_URL` 时控制台与应用同源（`buildPlatformConsoleUrl` 也是这么兜底的），
 * 此时任何 origin 都算控制台。
 */
export function isPlatformConsoleOrigin(
  platformUrl: string | null | undefined,
  origin: string,
): boolean {
  const base = platformUrl?.trim().replace(/\/+$/u, "") ?? "";
  if (!base) return true;
  try {
    return new URL(base).origin === origin;
  } catch {
    // 配歪了的 PLATFORM_URL 不该让公开页跟着崩
    return false;
  }
}
