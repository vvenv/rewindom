import type { ReactNode } from "react";

import { TenantFilterProvider, usePublicConfig } from "@rewindom/client-kit";

import { TenantCombobox } from "../components/TenantCombobox.js";

/**
 * Registers platform's TenantCombobox into the client-shell tenant-filter slot,
 * so infra observability viewers (audit/error-log/slow-query) render a tenant
 * picker without importing module-platform. Contributed via shell.shellProviders;
 * if platform is disabled, the slot stays empty and viewers omit the filter.
 * 单租户部署不挂载筛选器。
 */
export function PlatformTenantFilterProvider({
  children,
}: {
  children: ReactNode;
}) {
  const {
    data: { single_tenant },
  } = usePublicConfig();

  if (single_tenant) {
    return children;
  }

  return (
    <TenantFilterProvider component={TenantCombobox}>
      {children}
    </TenantFilterProvider>
  );
}
