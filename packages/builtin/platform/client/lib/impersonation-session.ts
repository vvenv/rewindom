import {
  api,
  goToPlatformConsole,
  setStoredAuthTokens,
} from "@be-water/client-kit";

import {
  clearImpersonationBackup,
  readImpersonationBackup,
  readImpersonationMeta,
} from "./impersonation-storage.js";

import type { PublicConfig } from "@be-water/shared";

export function isInImpersonationSession(): boolean {
  return readImpersonationMeta() !== null && readImpersonationBackup() !== null;
}

/** Restore platform tokens and return to the platform console. */
export function exitImpersonation(): void {
  const backup = readImpersonationBackup();
  if (!backup) return;
  setStoredAuthTokens(backup);
  clearImpersonationBackup();
  void api
    .get<PublicConfig>("/public/config", undefined, true)
    .then((config) => {
      goToPlatformConsole(config.platform_url);
    })
    .catch(() => {
      goToPlatformConsole(null);
    });
}

/** Revoke current session and discard any saved platform backup. */
export async function logoutFully(logout: () => Promise<void>): Promise<void> {
  clearImpersonationBackup();
  await logout();
  window.location.href = "/login";
}
