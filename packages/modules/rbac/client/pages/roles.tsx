import { PageLayout, usePermissions } from "@be-water/client-kit";
import { DraggableFabTrigger } from "@be-water/ui/draggable-fab";
import { Plus, ShieldCheck } from "lucide-react";

import { RoleCreateSheet } from "../components/RoleSheet.js";
import { RolesTable } from "../components/RolesTable.js";
import { useRoles } from "../hooks/useRoles.js";

export function Roles() {
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("roles.write");
  const { data: roles, isLoading, isError, error, refetch } = useRoles();

  return (
    <PageLayout
      icon={ShieldCheck}
      title="角色权限"
      description="管理租户角色及其权限，成员通过被分配角色获得权限"
      action={
        canWrite ? (
          <RoleCreateSheet>
            <DraggableFabTrigger storageKey="roles_create_fab">
              <Plus className="size-6 md:size-4" />
              <span className="hidden md:inline">新建角色</span>
            </DraggableFabTrigger>
          </RoleCreateSheet>
        ) : null
      }
    >
      <div className="flex flex-col gap-4">
        <RolesTable
          roles={roles ?? []}
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRetry={() => void refetch()}
        />
      </div>
    </PageLayout>
  );
}
