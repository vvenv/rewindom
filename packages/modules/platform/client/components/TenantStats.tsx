import { usePlatformTenantStats } from "../hooks/usePlatformTenants.js";

export function TenantStats({ tenantId }: { tenantId: string }) {
  const { data: stats, isLoading } = usePlatformTenantStats(tenantId);

  if (isLoading) {
    return <span className="text-muted-foreground">…</span>;
  }

  if (!stats) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-muted-foreground">
      <span>文档 {stats.document_count}</span>
      <span>产品 {stats.product_count}</span>
      <span>分析 {stats.analysis_count}</span>
      <span>用户 {stats.user_count}</span>
    </div>
  );
}
