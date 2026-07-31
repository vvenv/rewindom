import { PageLayout } from "@be-water/client-kit";
import { LayoutDashboard } from "lucide-react";
import { useTranslation } from "react-i18next";

import { DashboardEmptyState } from "../components/DashboardEmptyState.js";
import { DashboardWidgetGrid } from "../components/DashboardWidgetGrid.js";
import { useDashboardWidgets } from "../hooks/useDashboardWidgets.js";

export function Dashboard() {
  const { t } = useTranslation("dashboard");
  const widgets = useDashboardWidgets();

  return (
    <PageLayout
      icon={LayoutDashboard}
      title={t("page.title")}
      description={t("page.description")}
    >
      {widgets.length === 0 ? (
        <DashboardEmptyState />
      ) : (
        <DashboardWidgetGrid widgets={widgets} />
      )}
    </PageLayout>
  );
}
