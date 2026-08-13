import { EmptyState } from "@rewindom/client-kit";
import { EyeOff, LayoutDashboard } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * 两种空：租户压根没开通任何贡献卡片的模块，或用户把卡片全隐藏了。
 * 后者必须换个说法——否则用户会以为系统坏了，而不是自己关的。
 */
export function DashboardEmptyState({ allHidden }: { allHidden?: boolean }) {
  const { t } = useTranslation("dashboard");

  if (allHidden) {
    return (
      <EmptyState
        icon={EyeOff}
        title={t("emptyState.allHiddenTitle")}
        description={t("emptyState.allHiddenHint")}
      />
    );
  }

  return (
    <EmptyState
      icon={LayoutDashboard}
      title={t("emptyState.title")}
      description={t("emptyState.hint")}
    />
  );
}
