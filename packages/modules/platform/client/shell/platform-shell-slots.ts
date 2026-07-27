import { isInImpersonationSession } from "../lib/impersonation-session.js";

export function usePlatformImpersonationActive(): boolean {
  return isInImpersonationSession();
}
