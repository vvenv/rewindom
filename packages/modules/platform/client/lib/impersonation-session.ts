import { setStoredAuthTokens } from "@be-water/client-kit";

import {
  clearImpersonationBackup,
  readImpersonationBackup,
  readImpersonationMeta,
} from "./impersonation-storage.js";

export function isInImpersonationSession(): boolean {
  return readImpersonationMeta() !== null && readImpersonationBackup() !== null;
}

/** Restore platform tokens and return to the platform console. */
export function exitImpersonation(): void {
  const backup = readImpersonationBackup();
  if (!backup) return;
  setStoredAuthTokens(backup);
  clearImpersonationBackup();
  window.location.href = "/platform";
}

/** Revoke current session and discard any saved platform backup. */
export async function logoutFully(logout: () => Promise<void>): Promise<void> {
  clearImpersonationBackup();
  await logout();
  window.location.href = "/login";
}
