import { useCallback, useState } from "react";

import { ApiError, useConfirm  } from "@be-water/client-kit";
import { toast } from "@be-water/ui/toast";

import {
  useArchivePlatformTenant,
  usePatchPlatformTenant,
} from "./usePlatformTenants.js";

import type { TenantSummary } from "../../shared/index.js";

export function usePlatformTenantActions() {
  const patchMutation = usePatchPlatformTenant();
  const archiveMutation = useArchivePlatformTenant();
  const { confirm } = useConfirm();

  const [actingId, setActingId] = useState<string | null>(null);

  const handleArchive = useCallback(
    async (tenant: TenantSummary): Promise<void> => {
      const ok = await confirm({
        title: "归档租户",
        description: `确定归档租户「${tenant.name}」？归档后用户无法登录，数据保留在库中。`,
        destructive: true,
      });
      if (!ok) return;

      setActingId(tenant.id);
      try {
        await archiveMutation.mutateAsync(tenant.id);
        toast.success("租户已归档");
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "归档失败");
      } finally {
        setActingId(null);
      }
    },
    [archiveMutation, confirm],
  );

  const toggleStatus = useCallback(
    async (tenant: TenantSummary): Promise<void> => {
      const suspend = tenant.status === "active";
      if (suspend) {
        const ok = await confirm({
          title: "暂停租户",
          description: `确定暂停租户「${tenant.name}」？暂停后该租户用户将无法登录与调用 API。`,
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
        toast.success(suspend ? "租户已暂停" : "租户已恢复");
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "操作失败");
      } finally {
        setActingId(null);
      }
    },
    [confirm, patchMutation],
  );

  return {
    actingId,
    setActingId,
    handleArchive,
    toggleStatus,
  };
}
