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
