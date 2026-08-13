
import { Alert, AlertAction, AlertDescription } from "@rewindom/ui/alert";
import { Button } from "@rewindom/ui/button";
import { Spinner } from "@rewindom/ui/spinner";
import { Building2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { TenantCard } from "./TenantCard.js";

import type { TenantSummary } from "../../shared/index.js";
import type { PlatformTenantListFilters } from "../lib/platform/tenants/url.js";

export function TenantListView({
  tenants,
  filters,
  isLoading,
  isError,
  actingId,
  onRetry,
  onActingChange,
  onToggleStatus,
  onArchive,
}: {
  tenants: TenantSummary[];
  filters: PlatformTenantListFilters;
  isLoading: boolean;
  isError: boolean;
  actingId: string | null;
  onRetry: () => void;
  onActingChange: (tenantId: string, acting: boolean) => void;
  onToggleStatus: (tenant: TenantSummary) => void;
  onArchive: (tenant: TenantSummary) => void;
}) {
  const { t } = useTranslation(["platform", "common"]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{t("tenants.loadFailed")}</AlertDescription>
        <AlertAction>
          <Button variant="outline" size="sm" onClick={onRetry}>
            {t("common:retry")}
          </Button>
        </AlertAction>
      </Alert>
    );
  }

  if (tenants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <div className="rounded-full bg-muted p-4">
          <Building2 className="size-8 text-muted-foreground" />
        </div>
        <div className="space-y-1 text-center">
          <p className="text-sm font-medium">
            {filters.q || filters.status
              ? t("tenants.noMatch")
              : t("tenants.empty")}
          </p>
          <p className="text-sm text-muted-foreground">
            {filters.q || filters.status
              ? t("tenants.changeFilters")
              : t("tenants.createHint")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {tenants.map((tenant) => (
        <TenantCard
          key={tenant.id}
          tenant={tenant}
          acting={actingId === tenant.id}
          onActingChange={(acting) => onActingChange(tenant.id, acting)}
          onToggleStatus={() => onToggleStatus(tenant)}
          onArchive={() => onArchive(tenant)}
        />
      ))}
    </div>
  );
}
