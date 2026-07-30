import { PageLayout } from "@be-water/client-kit";
import { LayoutDashboard } from "lucide-react";

import { DashboardEmptyState } from "../components/DashboardEmptyState.js";
import { DashboardWidgetGrid } from "../components/DashboardWidgetGrid.js";
import { useDashboardWidgets } from "../hooks/useDashboardWidgets.js";

export function Dashboard() {
  const widgets = useDashboardWidgets();

  return (
    <PageLayout
      icon={LayoutDashboard}
      title="工作台"
      description="登录后的默认首页，汇总各模块贡献的概览卡片与快捷入口"
    >
      {widgets.length === 0 ? (
        <DashboardEmptyState />
      ) : (
        <DashboardWidgetGrid widgets={widgets} />
      )}
    </PageLayout>
  );
}
