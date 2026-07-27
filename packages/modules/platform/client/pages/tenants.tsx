import { TenantCreateDialog } from "../components/TenantCreateDialog.js";
import { TenantFilters } from "../components/TenantFilters.js";
import { TenantListView } from "../components/TenantListView.js";
import { usePlatformTenantActions } from "../hooks/usePlatformTenantActions.js";
import { usePlatformTenantsPage } from "../hooks/usePlatformTenantsPage.js";

export function Tenants() {
  const { filters, displayedTenants, isLoading, isError, refetch } =
    usePlatformTenantsPage();

  const { actingId, setActingId, handleArchive, toggleStatus } =
    usePlatformTenantActions();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="hidden text-muted-foreground sm:block">
          创建、暂停或恢复 SaaS 租户组织
        </p>
        <TenantCreateDialog />
      </div>

      <TenantFilters filters={filters} />

      <TenantListView
        tenants={displayedTenants}
        filters={filters}
        isLoading={isLoading}
        isError={isError}
        actingId={actingId}
        onRetry={() => void refetch()}
        onActingChange={(tenantId, acting) =>
          setActingId(acting ? tenantId : null)
        }
        onToggleStatus={(tenant) => void toggleStatus(tenant)}
        onArchive={(tenant) => void handleArchive(tenant)}
      />
    </div>
  );
}
