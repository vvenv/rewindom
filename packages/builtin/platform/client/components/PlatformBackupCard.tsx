import { useState } from "react";

import { ApiError } from "@be-water/client-kit";
import { Button } from "@be-water/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@be-water/ui/card";
import { Spinner } from "@be-water/ui/spinner";
import { toast } from "@be-water/ui/toast";
import { DatabaseBackup, HardDriveDownload, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useTaskCenter } from "../../../background-job/client/hooks/useTaskCenter.js";
import { DATABASE_BACKUP_TASK_TITLE_PREFIX } from "../../../background-job/shared/index.js";
import { usePlatformBackupActions } from "../hooks/usePlatformBackup.js";

import { PlatformRestoreSheet } from "./PlatformRestoreSheet.js";

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
      toast.success(t("platform:settings.backup.backup.started"));
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : t("platform:settings.backup.backup.startFailed"),
      );
    } finally {
      setStarting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1">
          <DatabaseBackup className="size-4" />
          {t("platform:settings.backup.title")}
        </CardTitle>
        <CardDescription>
          {t("platform:settings.backup.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">
              {t("platform:settings.backup.backup.label")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("platform:settings.backup.backup.hint")}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={starting}
            onClick={() => void handleBackup()}
          >
            {starting ? <Spinner /> : <HardDriveDownload className="size-3.5" />}
            {t("platform:settings.backup.backup.trigger")}
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 p-4">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">
              {t("platform:settings.backup.restore.label")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("platform:settings.backup.restore.hint")}
            </p>
          </div>
          <PlatformRestoreSheet>
            <Button variant="outline" size="sm">
              <RotateCcw className="size-3.5" />
              {t("platform:settings.backup.restore.trigger")}
            </Button>
          </PlatformRestoreSheet>
        </div>
      </CardContent>
    </Card>
  );
}
