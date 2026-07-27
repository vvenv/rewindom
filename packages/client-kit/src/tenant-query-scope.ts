import { useMemo } from "react";

import { useAuth } from "./hooks/useAuth";
import { getStoredAccessToken } from "./lib/auth-token-storage";

/** Minimal JWT payload shape needed for query-scope; not for authorization. */
interface TokenTenantPayload {
  tenant_id?: string;
}

/** Read tenant_id from JWT payload (React Query cache-key scoping only; not for authz). */
export function readTenantIdFromAccessToken(
  token: string | null | undefined,
): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(atob(parts[1]!)) as TokenTenantPayload;
    return typeof payload.tenant_id === "string" ? payload.tenant_id : null;
  } catch {
    return null;
  }
}

export function readStoredTenantQueryScope(): string | null {
  return readTenantIdFromAccessToken(getStoredAccessToken());
}

/** Tenant scope for React Query keys only (not exposed to business UI). */
export function useTenantQueryScope(): string | null {
  const { accessToken } = useAuth();
  return useMemo(() => readTenantIdFromAccessToken(accessToken), [accessToken]);
}
