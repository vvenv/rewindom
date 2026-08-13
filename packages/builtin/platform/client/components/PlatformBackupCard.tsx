import { useState } from "react";

import { ApiError } from "@rewindom/client-kit";
import { Button } from "@rewindom/ui/button";
import { Card, CardContent } from "@rewindom/ui/card";
import { Spinner } from "@rewindom/ui/spinner";
import { toast } from "@rewindom/ui/toast";
import { HardDriveDownload, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useTaskCenter } from "../../../background-job/client/hooks/useTaskCenter.js";
import { DATABASE_BACKUP_TASK_TITLE_PREFIX } from "../../../background-job/shared/index.js";
import { usePlatformBackupActions } from "../hooks/usePlatformBackup.js";

import { PlatformRestoreSheet } from "./PlatformRestoreSheet.js";

/**
 * 备份 / 还原两个动作区。页面标题由 PlatformLayout 提供，这里不再重复。
 */
export function PlatformBackupCard() {
  const { t } = useTranslation(["platform", "common"]);
  const { runServerBackedTask, openTaskCenter } = useTaskCenter();
  const { startBackup } = usePlatformBackupActions();
  const [starting, setStarting] = useState(false);

  const handleBackup = async (): Promise<void> => {
    setStarting(true);
    try {
      runServerBackedTask({
        title: DATABASE_BACKUP_TASK_TITLE_PREFIX,
        startJob: () => startBackup(DATABASE_BACKUP_TASK_TITLE_PREFIX),
      });
      openTaskCenter();
      toast.success(t("platform:backup.backup.started"));
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : t("platform:backup.backup.startFailed"),
      );
    } finally {
      setStarting(false);
    }
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">
              {t("platform:backup.backup.label")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("platform:backup.backup.hint")}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={starting}
            onClick={() => void handleBackup()}
          >
            {starting ? <Spinner /> : <HardDriveDownload className="size-3.5" />}
            {t("platform:backup.backup.trigger")}
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 p-4">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">
              {t("platform:backup.restore.label")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("platform:backup.restore.hint")}
            </p>
          </div>
          <PlatformRestoreSheet>
            <Button variant="outline" size="sm">
              <RotateCcw className="size-3.5" />
              {t("platform:backup.restore.trigger")}
            </Button>
          </PlatformRestoreSheet>
        </div>
      </CardContent>
    </Card>
  );
}
