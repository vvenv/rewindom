import { findCatalogFeature, type TenantFeatureKey, type TenantModuleDefinition } from "@rewindom/shared";
import { Spinner } from "@rewindom/ui/spinner";
import { Outlet } from "react-router";

import { useTenantEntitlementState } from "../hooks/useTenantEntitlements.js";
import { getClientTenantCatalog } from "../lib/tenant-catalog.js";

interface TenantEntitlementRouteProps {
  moduleId?: string;
  feature?: TenantFeatureKey;
  label?: string;
  disabledHint?: string;
}

export function TenantEntitlementRoute({
  moduleId,
  feature,
  label,
  disabledHint,
}: TenantEntitlementRouteProps) {
  const { enabled, isLoading } = useTenantEntitlementState(moduleId, feature);

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

  if (feature) {
    const catalog = getClientTenantCatalog();
    const definition = findCatalogFeature(catalog, feature);
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-2 py-12 text-center">
        <h2 className="text-lg font-medium">
          {label ?? definition?.label ?? feature}
        </h2>
        <p className="text-sm text-muted-foreground">
          {disabledHint ?? definition?.disabled_hint ?? "该功能未启用"}
        </p>
        <p className="text-sm text-muted-foreground">
          如需开通，请联系平台管理员。
        </p>
      </div>
    );
  }

  const definition = moduleId
    ? getClientTenantCatalog().modules.find(
        (module: TenantModuleDefinition) => module.module_id === moduleId,
      )
    : undefined;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-2 py-12 text-center">
      <h2 className="text-lg font-medium">
        {label ?? definition?.label ?? moduleId ?? "功能"}
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
