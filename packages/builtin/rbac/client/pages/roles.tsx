import { PageLayout, usePermissions } from "@be-water/client-kit";
import { DraggableFabTrigger } from "@be-water/ui/draggable-fab";
import { Plus, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

import { RoleCreateSheet } from "../components/RoleSheet.js";
import { RolesTable } from "../components/RolesTable.js";
import { useRoles } from "../hooks/useRoles.js";

export function Roles() {
  const { t } = useTranslation("rbac");
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("roles.write");
  const { data: roles, isLoading, isError, error, refetch } = useRoles();

  return (
    <PageLayout
      icon={ShieldCheck}
      title={t("page.title")}
      description={t("page.description")}
      action={
        canWrite ? (
          <RoleCreateSheet>
            <DraggableFabTrigger storageKey="roles_create_fab">
              <Plus className="size-6 md:size-4" />
              <span className="hidden md:inline">{t("page.createRole")}</span>
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
