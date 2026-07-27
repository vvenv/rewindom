import { useCallback, useState } from "react";

import { api, useAuth  } from "@be-water/client-kit";
import { formatBusinessDateOrTimeAgo, isPlatformAdminActor } from "@be-water/shared";
import { Button } from "@be-water/ui/button";
import { toast } from "@be-water/ui/toast";
import { cn } from "@be-water/ui/utils";
import {
  Ban,
  ChevronDown,
  ChevronRight,
  Download,
  ListTodo,
  Trash,
  X,
} from "lucide-react";

import {
  isDownloadableBackgroundTask,
  isPlatformBackupDownloadTask, type BackgroundJobDto 
} from "../../shared/index.js";
import { useTaskCenter } from "../hooks/useTaskCenter.js";
import {
  getTaskErrorDetails,
  getTaskSkipDetails,
} from "../lib/background-jobs.js";
import { taskCardExtrasSlot } from "../shell/task-center-slots.js";

import type {
  BackgroundTask,
  BackgroundTaskStatus,
} from "../contexts/TaskContext.js";

const STATUS_CARD_STYLES: Record<BackgroundTaskStatus, string> = {
  running:
    "bg-primary/5 dark:bg-primary/10 border-primary/20 dark:border-primary/30",
  success: "bg-success/10 border-success/30",
  warning: "bg-warning/10 border-warning/30",
  error: "bg-destructive/10 border-destructive/30",
  interrupted: "bg-warning/10 border-warning/30",
};

const STATUS_TITLE_COLORS: Record<BackgroundTaskStatus, string> = {
  running: "text-primary",
  success: "text-success",
  warning: "text-warning",
  error: "text-destructive",
  interrupted: "text-warning",
};

async function downloadPlatformBackupFile(jobId: string): Promise<void> {
  const { download_token } = await api.post<{ download_token: string }>(
    `/platform/backup/jobs/${jobId}/download-token`,
    {},
  );

  const url = `/api/platform/backup/jobs/${jobId}/download?download_token=${encodeURIComponent(download_token)}`;
  const link = document.createElement("a");
  link.href = url;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function splitTaskTitle(title: string): { label: string; detail?: string } {
  const sep = title.indexOf("：");
  if (sep === -1) {
    return { label: title };
  }
  return {
    label: title.slice(0, sep),
    detail: title.slice(sep + 1).trim(),
  };
}

function formatTaskDuration(createdAt: number, finishedAt: number): string {
  return `${((finishedAt - createdAt) / 1000).toFixed(0)}s`;
}

function canDownloadTaskFile(task: BackgroundTask): boolean {
  return (
    isDownloadableBackgroundTask(task) &&
    (task.status === "success" || task.status === "warning") &&
    Boolean(task.serverJobId)
  );
}

function TaskExpandableDetails({
  label,
  expandedLabel,
  items,
  footer,
}: {
  label: string;
  expandedLabel: string;
  items: string[];
  footer?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) {
    return null;
  }

  const toggleLabel = expanded ? expandedLabel : label;

  return (
    <div className="overflow-hidden rounded-md border border-border/60 bg-background/40 dark:bg-background/25">
      <button
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-xs font-medium transition-colors hover:bg-muted/60"
      >
        {expanded ? (
          <ChevronDown className="size-3.5 shrink-0 opacity-70" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 opacity-70" />
        )}
        <span className="flex-1">{toggleLabel}</span>
      </button>
      {expanded && (
        <div className="border-t border-border/60 px-2.5 py-2">
          <ul className="max-h-40 space-y-1.5 overflow-y-auto text-xs leading-relaxed">
            {items.map((item, index) => (
              <li
                key={`${index}-${item}`}
                className="rounded-sm bg-background/50 px-2 py-1.5 text-foreground/85"
              >
                {item}
              </li>
            ))}
          </ul>
          {footer && (
            <p className="mt-2 text-xs text-muted-foreground">{footer}</p>
          )}
        </div>
      )}
    </div>
  );
}

function TaskErrorDetails({ errors }: { errors: string[] }) {
  const label =
    errors.length === 1 ? "查看错误详情" : `查看错误详情 (${errors.length})`;

  return (
    <TaskExpandableDetails
      label={label}
      expandedLabel="收起错误详情"
      items={errors}
    />
  );
}

function TaskSkipDetails({
  skipDetails,
}: {
  skipDetails: NonNullable<ReturnType<typeof getTaskSkipDetails>>;
}) {
  const [expanded, setExpanded] = useState(false);
  const totalSkipped = skipDetails.summary?.reduce(
    (sum: number, item: { count: number }) => sum + item.count,
    0,
  );
  const hasSummary = (skipDetails.summary?.length ?? 0) > 0;
  const hasDetails = (skipDetails.details?.length ?? 0) > 0;

  if (!hasSummary && !hasDetails) {
    return null;
  }

  const label =
    totalSkipped != null && totalSkipped > 0
      ? `查看跳过详情 (${totalSkipped})`
      : "查看跳过详情";

  return (
    <div className="overflow-hidden rounded-md border border-border/60 bg-background/40 dark:bg-background/25">
      <button
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-xs font-medium transition-colors hover:bg-muted/60"
      >
        {expanded ? (
          <ChevronDown className="size-3.5 shrink-0 opacity-70" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 opacity-70" />
        )}
        <span className="flex-1">{expanded ? "收起跳过详情" : label}</span>
      </button>
      {expanded && (
        <div className="space-y-2 border-t border-border/60 px-2.5 py-2 text-xs leading-relaxed">
          {hasSummary && (
            <ul className="space-y-1">
              {skipDetails.summary!.map(
                (item: { reason: string; count: number }) => (
                  <li
                    key={item.reason}
                    className="rounded-sm bg-background/50 px-2 py-1.5 text-foreground/85"
                  >
                    {item.reason}：{item.count} 条
                  </li>
                ),
              )}
            </ul>
          )}
          {hasDetails && (
            <ul className="max-h-40 space-y-1.5 overflow-y-auto">
              {skipDetails.details!.map((item: string, index: number) => (
                <li
                  key={`${index}-${item}`}
                  className="rounded-sm bg-background/50 px-2 py-1.5 text-foreground/70"
                >
                  {item}
                </li>
              ))}
            </ul>
          )}
          {skipDetails.truncated && (
            <p className="text-muted-foreground">
              仅显示前 {skipDetails.details?.length ?? 0} 条记录，其余已省略
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface TaskCardProps {
  task: BackgroundTask;
  downloading: boolean;
  onDismiss: () => void;
  onCancel: () => void;
  onDownload: () => void;
}

function TaskCard({
  task,
  downloading,
  onDismiss,
  onCancel,
  onDownload,
}: TaskCardProps) {
  const TaskCardExtras = taskCardExtrasSlot.useSlot();
  const [hideDescription, setHideDescription] = useState(false);
  const { label, detail } = splitTaskTitle(task.title);
  const errorDetails = getTaskErrorDetails(task);
  const skipDetails = getTaskSkipDetails(task);
  const shouldShowDescription =
    Boolean(task.description) &&
    (errorDetails.length === 0 || task.status === "warning") &&
    !hideDescription;
  const showDownload = canDownloadTaskFile(task);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border text-sm text-foreground",
        STATUS_CARD_STYLES[task.status],
      )}
    >
      <div className="flex items-start gap-1 px-3 pt-2.5">
        <div className="min-w-0 flex-1 space-y-0.5">
          <p
            className={cn(
              "font-medium leading-snug",
              STATUS_TITLE_COLORS[task.status],
            )}
          >
            {label}
          </p>
          {detail && (
            <p
              className="truncate text-xs text-muted-foreground"
              title={detail}
            >
              {detail}
            </p>
          )}
        </div>
        {task.status === "running" ? (
          <Button
            variant="ghost"
            size="icon-xs"
            className="shrink-0 -mr-1 -mt-0.5 opacity-70 hover:opacity-100"
            onClick={onCancel}
            title="取消任务"
          >
            <Ban className="size-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon-xs"
            className="shrink-0 -mr-1 -mt-0.5 opacity-70 hover:opacity-100"
            onClick={onDismiss}
            title="移除"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>

      {(shouldShowDescription ||
        errorDetails.length > 0 ||
        skipDetails ||
        showDownload ||
        TaskCardExtras) && (
        <div className="space-y-2 px-3 pb-2 pt-2">
          {TaskCardExtras ? (
            <TaskCardExtras
              task={task}
              onProgressVisible={setHideDescription}
            />
          ) : null}
          {shouldShowDescription && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {task.description}
            </p>
          )}
          {skipDetails && <TaskSkipDetails skipDetails={skipDetails} />}
          {errorDetails.length > 0 && (
            <TaskErrorDetails errors={errorDetails} />
          )}
          {showDownload && (
            <Button
              variant="secondary"
              size="sm"
              className="h-8 w-full"
              disabled={downloading}
              onClick={onDownload}
            >
              <Download className="size-3.5" />
              {downloading ? "下载中…" : "下载文件"}
            </Button>
          )}
        </div>
      )}

      <div className="flex items-center gap-1.5 border-t border-border/50 px-3 py-1.5 text-[11px] text-muted-foreground">
        <span>{formatBusinessDateOrTimeAgo(task.createdAt, 1)}</span>
        {task.finishedAt != null && (
          <>
            <span aria-hidden>·</span>
            <span>
              耗时 {formatTaskDuration(task.createdAt, task.finishedAt)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export function TaskCenterContent() {
  const { user } = useAuth();
  const isPlatformAdmin =
    user !== null && isPlatformAdminActor(user.actor_type);
  const backgroundJobPath = useCallback(
    (jobId: string) =>
      isPlatformAdmin
        ? `/platform/background-jobs/${jobId}`
        : `/background-jobs/${jobId}`,
    [isPlatformAdmin],
  );
  const { tasks, dismissTask, cancelTask, clearFinished, updateTask } =
    useTaskCenter();
  const [downloadingTaskId, setDownloadingTaskId] = useState<string | null>(
    null,
  );
  const finishedCount = tasks.filter(
    (task) => task.status !== "running",
  ).length;

  const handleDownloadFile = useCallback(
    async (task: BackgroundTask) => {
      if (!task.serverJobId) return;

      setDownloadingTaskId(task.id);
      try {
        if (isPlatformBackupDownloadTask(task)) {
          await downloadPlatformBackupFile(task.serverJobId);
          updateTask(task.id, { exportFileDownloaded: true });
          toast.success("备份文件已开始下载");
          return;
        }

        const job = await api.get<BackgroundJobDto>(
          backgroundJobPath(task.serverJobId),
        );
        const fileResult = job.result as { filename?: string } | null;
        const filename =
          task.exportFilename ??
          fileResult?.filename ??
          `backup_${new Date().toISOString().slice(0, 10)}.zip`;

        await downloadPlatformBackupFile(task.serverJobId);
        updateTask(task.id, {
          exportFileDownloaded: true,
          exportFilename: filename,
        });
        toast.success("文件已开始下载");
      } catch (error) {
        const message = error instanceof Error ? error.message : "请稍后重试";
        toast.error("下载失败", { description: message });
      } finally {
        setDownloadingTaskId(null);
      }
    },
    [updateTask, backgroundJobPath],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col px-4">
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto",
          !finishedCount && "pb-0",
        )}
      >
        {tasks.length === 0 ? (
          <div className="flex h-[200px] flex-col items-center justify-center text-muted-foreground">
            <ListTodo className="mb-2 h-8 w-8 opacity-50" />
            <p>暂无任务</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                downloading={downloadingTaskId === task.id}
                onDismiss={() => dismissTask(task.id)}
                onCancel={() => cancelTask(task.id)}
                onDownload={() => void handleDownloadFile(task)}
              />
            ))}
          </div>
        )}
      </div>
      {finishedCount > 0 && (
        <div className="shrink-0 py-3">
          <Button variant="outline" className="w-full" onClick={clearFinished}>
            <Trash className="size-4" />
            清除已完成
          </Button>
        </div>
      )}
    </div>
  );
}
