import { useRef, useState, type ReactNode, type SubmitEvent } from "react";

import { ApiError, useConfirm } from "@be-water/client-kit";
import { formatBusinessDate } from "@be-water/shared";
import { Alert, AlertDescription, AlertTitle } from "@be-water/ui/alert";
import { Button } from "@be-water/ui/button";
import { Field, FieldGroup, FieldLabel } from "@be-water/ui/field";
import { Input } from "@be-water/ui/input";
import { RadioGroup, RadioGroupItem } from "@be-water/ui/radio-group";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@be-water/ui/sheet";
import { Spinner } from "@be-water/ui/spinner";
import { toast } from "@be-water/ui/toast";
import { AlertTriangle, DatabaseBackup, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useTaskCenter } from "../../../background-job/client/hooks/useTaskCenter.js";
import { DATABASE_RESTORE_TASK_TITLE_PREFIX } from "../../../background-job/shared/index.js";
import { DATABASE_DUMP_FILE_EXTENSION } from "../../shared/index.js";
import {
  usePlatformBackupActions,
  usePlatformLocalRestoreCandidates,
} from "../hooks/usePlatformBackup.js";
import {
  formatBackupSize,
  isDatabaseDumpFilename,
} from "../lib/backup-restore.js";

type RestoreSource = "local" | "upload";

interface PlatformRestoreSheetProps {
  children?: ReactNode;
}

export function PlatformRestoreSheet({ children }: PlatformRestoreSheetProps) {
  const { t } = useTranslation(["platform", "common"]);
  const { confirm } = useConfirm();
  const { runServerBackedTask, openTaskCenter } = useTaskCenter();
  const { startLocalRestore, startUploadRestore } = usePlatformBackupActions();

  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<RestoreSource>("local");
  const [selectedPath, setSelectedPath] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 只在抽屉打开时扫盘：白名单目录可能挂在网络存储上，平时列它没有意义
  const {
    data: candidates = [],
    isLoading: candidatesLoading,
    refetch: refetchCandidates,
  } = usePlatformLocalRestoreCandidates(open);

  const handleOpenChange = (nextOpen: boolean): void => {
    setOpen(nextOpen);
    if (nextOpen) {
      setSource("local");
      setSelectedPath("");
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      // 每次打开都重扫：期间可能刚跑完一次备份，或运维手动放了新文件进去
      void refetchCandidates();
    }
  };

  const resolveTaskTitle = (label: string): string =>
    `${DATABASE_RESTORE_TASK_TITLE_PREFIX}：${label}`;

  const handleSubmit = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();

    const picked =
      source === "local"
        ? candidates.find((item) => item.file_path === selectedPath)
        : null;

    if (source === "local" && !picked) {
      toast.error(t("platform:settings.backup.restore.selectFileFirst"));
      return;
    }
    if (source === "upload" && !file) {
      toast.error(t("platform:settings.backup.restore.chooseFileFirst"));
      return;
    }
    if (source === "upload" && file && !isDatabaseDumpFilename(file.name)) {
      toast.error(t("platform:settings.backup.restore.wrongFormat"));
      return;
    }

    const label = source === "local" ? picked!.filename : file!.name;

    const confirmed = await confirm({
      title: t("platform:settings.backup.restore.confirmTitle"),
      description: t("platform:settings.backup.restore.confirmDescription", {
        filename: label,
      }),
      confirmText: t("platform:settings.backup.restore.confirmSubmit"),
      cancelText: t("common:cancel"),
      destructive: true,
    });
    if (!confirmed) return;

    setSubmitting(true);
    try {
      runServerBackedTask({
        title: resolveTaskTitle(label),
        startJob: () =>
          source === "local"
            ? startLocalRestore(picked!.file_path)
            : startUploadRestore(file!),
      });
      setOpen(false);
      openTaskCenter();
      toast.success(t("platform:settings.backup.restore.started"));
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : t("platform:settings.backup.restore.startFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        {children ?? (
          <Button variant="outline" size="sm">
            <RotateCcw className="size-3.5" />
            {t("platform:settings.backup.restore.trigger")}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader className="shrink-0 border-b pb-4">
          <SheetTitle className="pr-8">
            {t("platform:settings.backup.restore.title")}
          </SheetTitle>
          <SheetDescription>
            {t("platform:settings.backup.restore.description")}
          </SheetDescription>
        </SheetHeader>
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-4">
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>
                {t("platform:settings.backup.restore.warningTitle")}
              </AlertTitle>
              <AlertDescription>
                {t("platform:settings.backup.restore.warningDescription")}
              </AlertDescription>
            </Alert>

            <FieldGroup className="mt-4">
              <Field>
                <FieldLabel>
                  {t("platform:settings.backup.restore.sourceLabel")}
                </FieldLabel>
                <RadioGroup
                  value={source}
                  onValueChange={(value) => setSource(value as RestoreSource)}
                  className="gap-2"
                >
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm">
                    <RadioGroupItem value="local" id="restore-source-local" />
                    <span className="flex-1">
                      {t("platform:settings.backup.restore.sourceLocal")}
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm">
                    <RadioGroupItem value="upload" id="restore-source-upload" />
                    <span className="flex-1">
                      {t("platform:settings.backup.restore.sourceUpload")}
                    </span>
                  </label>
                </RadioGroup>
              </Field>

              {source === "local" ? (
                <Field>
                  <FieldLabel>
                    {t("platform:settings.backup.restore.localFilesLabel")}
                  </FieldLabel>
                  {candidatesLoading ? (
                    <div className="flex justify-center py-6">
                      <Spinner />
                    </div>
                  ) : candidates.length === 0 ? (
                    <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      {t("platform:settings.backup.restore.noLocalFiles")}
                    </p>
                  ) : (
                    <RadioGroup
                      value={selectedPath}
                      onValueChange={setSelectedPath}
                      className="gap-2"
                    >
                      {candidates.map((item) => (
                        <label
                          key={item.file_path}
                          className="flex cursor-pointer items-start gap-2 rounded-lg border p-3"
                          title={item.file_path}
                        >
                          <RadioGroupItem
                            value={item.file_path}
                            id={`restore-candidate-${item.file_path}`}
                            className="mt-0.5"
                          />
                          <span className="min-w-0 flex-1 space-y-0.5">
                            <span className="block truncate font-mono text-sm">
                              {item.filename}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {formatBackupSize(item.size_bytes)} ·{" "}
                              {formatBusinessDate(item.modified_at)}
                            </span>
                          </span>
                        </label>
                      ))}
                    </RadioGroup>
                  )}
                </Field>
              ) : (
                <Field>
                  <FieldLabel htmlFor="restore-upload-file">
                    {t("platform:settings.backup.restore.uploadLabel")}
                  </FieldLabel>
                  <Input
                    ref={fileInputRef}
                    id="restore-upload-file"
                    type="file"
                    accept={DATABASE_DUMP_FILE_EXTENSION}
                    onChange={(event) =>
                      setFile(event.target.files?.[0] ?? null)
                    }
                  />
                  {file && (
                    <p className="text-xs text-muted-foreground">
                      {formatBackupSize(file.size)}
                    </p>
                  )}
                </Field>
              )}
            </FieldGroup>
          </div>
          <SheetFooter className="shrink-0">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => setOpen(false)}
            >
              {t("common:cancel")}
            </Button>
            <Button type="submit" variant="destructive" disabled={submitting}>
              {submitting ? <Spinner /> : <DatabaseBackup className="size-4" />}
              {t("platform:settings.backup.restore.submit")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
