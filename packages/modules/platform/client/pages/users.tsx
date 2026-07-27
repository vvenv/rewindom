import { UsersFilterBar } from "../components/UsersFilterBar.js";
import { UsersTable } from "../components/UsersTable.js";
import { usePlatformUsers } from "../hooks/usePlatformUsers.js";
import { usePlatformUsersPage } from "../hooks/usePlatformUsersPage.js";

export function Users() {
  const {
    search,
    tenant_slug,
    page,
    pageSize,
    hasActiveFilters,
    sortBy,
    sortDir,
    sorting,
    updateParam,
    resetFilters,
    handleSortingChange,
  } = usePlatformUsersPage();

  const { data, isLoading, error } = usePlatformUsers(
    page,
    pageSize,
    search,
    tenant_slug,
    sortBy,
    sortDir,
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="hidden text-muted-foreground md:block">
        跨租户用户列表（只读）
      </p>

      <UsersFilterBar
        search={search}
        tenant_slug={tenant_slug}
        hasActiveFilters={hasActiveFilters}
        onSearchChange={(value) => updateParam("q", value)}
        onTenantChange={(slug) => updateParam("tenant_slug", slug ?? undefined)}
        onReset={resetFilters}
      />

      <UsersTable
        users={data?.items ?? []}
        isLoading={isLoading}
        error={error}
        page={data?.page ?? page}
        pageSize={data?.page_size ?? pageSize}
        total={data?.total ?? 0}
        pageCount={data?.page_count ?? 0}
        sorting={sorting}
        onSortingChange={handleSortingChange}
      />
    </div>
  );
}
