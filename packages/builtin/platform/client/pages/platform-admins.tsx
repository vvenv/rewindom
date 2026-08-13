import { usePermissions } from "@rewindom/client-kit";

import { PlatformAdminsTable } from "../components/PlatformAdminsTable.js";
import { usePlatformAdmins } from "../hooks/usePlatformAdmins.js";
import { usePlatformAdminsPage } from "../hooks/usePlatformAdminsPage.js";

export function PlatformAdmins() {
  const { search, page, pageSize, sortBy, sortDir, sorting, updateSearch, handleSortingChange } =
    usePlatformAdminsPage();
  const { hasPermission } = usePermissions();
  const { data, isLoading, isError, error, refetch } = usePlatformAdmins(
    page,
    pageSize,
    search,
    sortBy,
    sortDir,
  );

  return (
    <div className="flex flex-col gap-4">
      <PlatformAdminsTable
        admins={data?.items ?? []}
        isLoading={isLoading}
        isError={isError}
        error={error}
        page={data?.page ?? page}
        pageSize={data?.page_size ?? pageSize}
        total={data?.total ?? 0}
        pageCount={data?.page_count ?? 0}
        search={search}
        onSearchChange={updateSearch}
        canManageAdmins={hasPermission("platform.admins.write")}
        canAssignRoles={hasPermission("platform.admins.assign")}
        canManageRoles={hasPermission("platform.roles.write")}
        onRetry={() => void refetch()}
        sorting={sorting}
        onSortingChange={handleSortingChange}
      />
    </div>
  );
}
