import { useConfirm } from "@rewindom/client-kit";
import { DraggableFabTrigger } from "@rewindom/ui/draggable-fab";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useCleanupErrorLogs } from "../hooks/useCleanupErrorLogs.js";

/** 保留天数。与服务端 `/error-logs/cleanup` 的默认值一致。 */
const CLEANUP_KEEP_DAYS = 30;

/** 触发按钮与确认、mutation、toast 内聚在一起，页面只负责放不放它。 */
export function ErrorLogCleanupAction() {
  const { t } = useTranslation("error-log");
  const { confirm } = useConfirm();
  const cleanupMutation = useCleanupErrorLogs();

  const handleClick = async () => {
    const confirmed = await confirm({
      title: t("cleanup.confirmTitle"),
      description: t("cleanup.confirmDescription", { days: CLEANUP_KEEP_DAYS }),
      destructive: true,
    });
    if (!confirmed) return;
    cleanupMutation.mutate(CLEANUP_KEEP_DAYS);
  };

  return (
    <DraggableFabTrigger
      storageKey="error_logs_cleanup_fab"
      onClick={() => void handleClick()}
      disabled={cleanupMutation.isPending}
    >
      <Trash2 className="size-6 md:size-4" />
      <span className="hidden md:inline">{t("cleanup.buttonLabel")}</span>
    </DraggableFabTrigger>
  );
}
