import type { ReactNode } from "react";

import { TenantFilterProvider } from "@be-water/client-kit";

import { TenantCombobox } from "../components/TenantCombobox.js";

/**
 * Registers platform's TenantCombobox into the client-shell tenant-filter slot,
 * so infra observability viewers (audit/error-log/slow-query) render a tenant
 * picker without importing module-platform. Contributed via shell.shellProviders;
 * if platform is disabled, the slot stays empty and viewers omit the filter.
 */
export function PlatformTenantFilterProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <TenantFilterProvider component={TenantCombobox}>
      {children}
    </TenantFilterProvider>
  );
}
