import { LayoutDashboard } from "lucide-react";
import { useTranslation } from "react-i18next";

/** 租户没开通任何贡献卡片的模块时（或产品仓还没接卡片）的兜底。 */
export function DashboardEmptyState() {
  const { t } = useTranslation("dashboard");

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <div className="rounded-full bg-muted p-4">
        <LayoutDashboard className="size-10" />
      </div>
      <div className="space-y-1 text-center">
        <p className="text-sm font-medium">{t("emptyState.title")}</p>
        <p className="text-sm text-muted-foreground">{t("emptyState.hint")}</p>
      </div>
    </div>
  );
}
