import { useTranslation } from "react-i18next";

import { usePlatformTenantStats } from "../hooks/usePlatformTenants.js";

export function TenantStats({ tenantId }: { tenantId: string }) {
  const { t } = useTranslation("platform");
  const { data: stats, isLoading } = usePlatformTenantStats(tenantId);

  if (isLoading) {
    return <span className="text-muted-foreground">…</span>;
  }

  if (!stats) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-muted-foreground">
      <span>
        {t("tenants.stats.documents")} {stats.document_count}
      </span>
      <span>
        {t("tenants.stats.products")} {stats.product_count}
      </span>
      <span>
        {t("tenants.stats.analysis")} {stats.analysis_count}
      </span>
      <span>
        {t("tenants.stats.users")} {stats.user_count}
      </span>
    </div>
  );
}
