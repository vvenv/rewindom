import { useMemo } from "react";

import { useAuth } from "./hooks/useAuth";

/** Tenant scope for React Query keys only (not exposed to business UI). */
export function useTenantQueryScope(): string | null {
  const { user } = useAuth();
  return useMemo(
    () => (typeof user?.tenant_id === "string" ? user.tenant_id : null),
    [user?.tenant_id],
  );
}
