import { PageLayout } from "@be-water/client-kit";
import { LayoutDashboard } from "lucide-react";
import { useTranslation } from "react-i18next";

import { DashboardEmptyState } from "../components/DashboardEmptyState.js";
import { DashboardSettingsAction } from "../components/DashboardSettingsSheet.js";
import { DashboardWidgetGrid } from "../components/DashboardWidgetGrid.js";
import { useDashboardWidgets } from "../hooks/useDashboardWidgets.js";

export function Dashboard() {
  const { t } = useTranslation("dashboard");
  const { widgets, allowedWidgets, preference, isPreferenceReady } =
    useDashboardWidgets();

  return (
    <PageLayout
      icon={LayoutDashboard}
      title={t("page.title")}
      description={t("page.description")}
      action={
        allowedWidgets.length > 0 ? (
          <DashboardSettingsAction
            allowedWidgets={allowedWidgets}
            preference={preference}
          />
        ) : undefined
      }
    >
      {allowedWidgets.length === 0 ? (
        <DashboardEmptyState />
      ) : !isPreferenceReady ? (
        // 个人布局还没回来：先占位，别让隐藏的卡片闪一下再消失
        <DashboardWidgetGrid widgets={[]} placeholderCount={allowedWidgets.length} />
      ) : widgets.length === 0 ? (
        <DashboardEmptyState allHidden />
      ) : (
        <DashboardWidgetGrid widgets={widgets} />
      )}
    </PageLayout>
  );
}
