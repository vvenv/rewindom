import { EmptyState } from "@be-water/client-kit";
import { LayoutDashboard } from "lucide-react";
import { useTranslation } from "react-i18next";

/** 租户没开通任何贡献卡片的模块时（或产品仓还没接卡片）的兜底。 */
export function DashboardEmptyState() {
  const { t } = useTranslation("dashboard");

  return (
    <EmptyState
      icon={LayoutDashboard}
      title={t("emptyState.title")}
      description={t("emptyState.hint")}
    />
  );
}
