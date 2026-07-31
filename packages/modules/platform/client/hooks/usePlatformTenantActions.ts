import { useCallback, useState } from "react";

import { ApiError, useConfirm  } from "@be-water/client-kit";
import { toast } from "@be-water/ui/toast";
import { useTranslation } from "react-i18next";

import {
  useArchivePlatformTenant,
  usePatchPlatformTenant,
} from "./usePlatformTenants.js";

import type { TenantSummary } from "../../shared/index.js";

export function usePlatformTenantActions() {
  const { t } = useTranslation(["platform", "common"]);
  const patchMutation = usePatchPlatformTenant();
  const archiveMutation = useArchivePlatformTenant();
  const { confirm } = useConfirm();

  const [actingId, setActingId] = useState<string | null>(null);

  const handleArchive = useCallback(
    async (tenant: TenantSummary): Promise<void> => {
      const ok = await confirm({
        title: t("tenants.actions.archiveTitle"),
        description: t("tenants.actions.archiveDescription", {
          name: tenant.name,
        }),
        destructive: true,
      });
      if (!ok) return;

      setActingId(tenant.id);
      try {
        await archiveMutation.mutateAsync(tenant.id);
        toast.success(t("tenants.actions.archived"));
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : t("tenants.actions.archiveFailed"),
        );
      } finally {
        setActingId(null);
      }
    },
    [archiveMutation, confirm, t],
  );

  const toggleStatus = useCallback(
    async (tenant: TenantSummary): Promise<void> => {
      const suspend = tenant.status === "active";
      if (suspend) {
        const ok = await confirm({
          title: t("tenants.actions.suspendTitle"),
          description: t("tenants.actions.suspendDescription", {
            name: tenant.name,
          }),
          destructive: true,
        });
        if (!ok) return;
      }

      setActingId(tenant.id);
      try {
        await patchMutation.mutateAsync({
          id: tenant.id,
          body: { status: suspend ? "suspended" : "active" },
        });
        toast.success(
          suspend ? t("tenants.actions.suspended") : t("tenants.actions.resumed"),
        );
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : t("tenants.actions.actionFailed"),
        );
      } finally {
        setActingId(null);
      }
    },
    [confirm, patchMutation, t],
  );

  return {
    actingId,
    setActingId,
    handleArchive,
    toggleStatus,
  };
}
