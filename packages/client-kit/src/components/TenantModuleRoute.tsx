import { Spinner } from "@rewindom/ui/spinner";
import { Outlet } from "react-router";

import { useTenantModuleEnabled } from "../hooks/useTenantEntitlements.js";
import { getClientTenantCatalog } from "../lib/tenant-catalog.js";

import type { TenantModuleDefinition } from "@rewindom/shared";

interface TenantModuleRouteProps {
  moduleId: string;
  label?: string;
  disabledHint?: string;
}

export function TenantModuleRoute({
  moduleId,
  label,
  disabledHint,
}: TenantModuleRouteProps) {
  const { enabled, isLoading } = useTenantModuleEnabled(moduleId);
  const definition = getClientTenantCatalog().modules.find(
    (module: TenantModuleDefinition) => module.module_id === moduleId,
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (enabled) {
    return <Outlet />;
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-2 py-12 text-center">
      <h2 className="text-lg font-medium">
        {label ?? definition?.label ?? moduleId}
      </h2>
      <p className="text-sm text-muted-foreground">
        {disabledHint ?? definition?.disabled_hint ?? "该模块未启用"}
      </p>
      <p className="text-sm text-muted-foreground">
        如需开通，请联系平台管理员。
      </p>
    </div>
  );
}
