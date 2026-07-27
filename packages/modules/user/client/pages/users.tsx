import { useMemo } from "react";

import { PageLayout, usePermissions } from "@be-water/client-kit";
import { DraggableFabTrigger } from "@be-water/ui/draggable-fab";
import { Plus, Users as UsersIcon } from "lucide-react";

import { UserFilters } from "../components/UserFilters.js";
import { UserCreateSheet } from "../components/UserSheet.js";
import { UsersTable } from "../components/UsersTable.js";
import { useUsers } from "../hooks/useUsers.js";
import { useUsersPage } from "../hooks/useUsersPage.js";

export function Users() {
  const {
    q,
    admin_type,
    page,
    pageSize,
    sortBy,
    sortDir,
    sorting,
    handleSortingChange,
    handleFiltersChange,
  } = useUsersPage();
  const { hasPermission } = usePermissions();

  const {
    data: users,
    isLoading,
    isError,
    error,
    refetch,
  } = useUsers(page, pageSize, q, sortBy, sortDir);

  const visibleUsers = useMemo(() => {
    const items = users?.items ?? [];
    if (admin_type === "system_admin") {
      return items.filter((user) => user.is_system_admin);
    }
    if (admin_type === "regular") {
      return items.filter((user) => !user.is_system_admin);
    }
    return items;
  }, [users?.items, admin_type]);

  return (
    <PageLayout
      icon={UsersIcon}
      title="用户管理"
      description="管理租户成员账号，并为其分配角色"
      action={
        hasPermission("users.write") ? (
          <UserCreateSheet>
            <DraggableFabTrigger storageKey="users_create_fab">
              <Plus className="size-6 md:size-4" />
              <span className="hidden md:inline">新建用户</span>
            </DraggableFabTrigger>
          </UserCreateSheet>
        ) : null
      }
    >
      <div className="flex flex-col gap-4">
        <UserFilters
          filters={{ q, admin_type }}
          onFiltersChange={handleFiltersChange}
        />

        <UsersTable
          users={visibleUsers}
          isLoading={isLoading}
          isError={isError}
          error={error}
          page={page}
          pageSize={pageSize}
          total={users?.total || 0}
          pageCount={users?.page_count}
          q={q}
          admin_type={admin_type}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          onRetry={() => void refetch()}
        />
      </div>
    </PageLayout>
  );
}
