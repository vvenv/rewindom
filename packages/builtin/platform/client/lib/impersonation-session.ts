import {
  api,
  goToPlatformConsole,
} from "@rewindom/client-kit";

import {
  clearImpersonationMeta,
  readImpersonationMeta,
} from "./impersonation-storage.js";

import type { PublicConfig } from "@rewindom/shared";

export function isInImpersonationSession(): boolean {
  return readImpersonationMeta() !== null;
}

/** Restore platform cookies via API and return to the platform console. */
export async function exitImpersonation(): Promise<void> {
  try {
    await api.post("/auth/exit-impersonation", {}, undefined, true);
  } catch {
    // 即使 restore 失败也清掉本地 meta，避免卡在模拟横幅。
  }
  clearImpersonationMeta();
  try {
    const config = await api.get<PublicConfig>(
      "/public/config",
      undefined,
      true,
    );
    goToPlatformConsole(config.platform_url);
  } catch {
    goToPlatformConsole(null);
  }
}

/** Revoke current session and discard any saved platform backup. */
export async function logoutFully(logout: () => Promise<void>): Promise<void> {
  clearImpersonationMeta();
  await logout();
  window.location.href = "/login";
}
