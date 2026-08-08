import { useEffect, useRef } from "react";

import { api, getI18n, useAuth } from "@be-water/client-kit";
import { isPlatformAdminActor } from "@be-water/shared";
import { toast } from "@be-water/ui/toast";

import { type BackgroundJobDto } from "../../shared/index.js";
import {
  extractJobErrorDetails,
  mapJobStatusToTaskStatus,
} from "../lib/background-jobs.js";

import type { BackgroundTask } from "../contexts/TaskContext.js";

const POLL_INTERVAL_MS = 3000;

function shouldPollServerJob(task: BackgroundTask): boolean {
  return Boolean(task.serverJobId) && task.status === "running";
}

interface UseServerJobPollerOptions {
  tasks: BackgroundTask[];
  updateTask: (id: string, patch: Partial<BackgroundTask>) => void;
  refreshTasks?: () => Promise<void>;
}

export function useServerJobPoller({
  tasks,
  updateTask,
  refreshTasks,
}: UseServerJobPollerOptions): void {
  const { isAuthenticated, user } = useAuth();
  const isPlatformAdmin =
    user !== null && isPlatformAdminActor(user.actor_type);
  const tasksRef = useRef(tasks);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const activeKey = tasks
    .filter(shouldPollServerJob)
    .map((task) => task.serverJobId)
    .join(",");

  useEffect(() => {
    if (!activeKey || !isAuthenticated) return;

    let cancelled = false;

    const poll = async (): Promise<void> => {
      const pending = tasksRef.current.filter(shouldPollServerJob);

      for (const task of pending) {
        if (cancelled || !task.serverJobId) continue;

        try {
          const jobPath = isPlatformAdmin
            ? `/platform/background-jobs/${task.serverJobId}`
            : `/background-jobs/${task.serverJobId}`;
          const job = await api.get<BackgroundJobDto>(jobPath);

          if (job.status === "running") {
            updateTask(task.id, {
              description: job.description ?? undefined,
            });
            continue;
          }

          const alreadyNotified = task.notified === true;
          const taskStatus = mapJobStatusToTaskStatus(job.status);
          const backupResult =
            job.type === "database_backup" || job.type === "data_backup"
              ? (job.result as { filename?: string } | null)
              : null;

          updateTask(task.id, {
            status: taskStatus,
            description: job.description ?? undefined,
            finishedAt: job.finished_at ?? Date.now(),
            exportFilename: backupResult?.filename ?? task.exportFilename,
            errorDetails: extractJobErrorDetails(job),
          });

          if (!alreadyNotified) {
            const t = getI18n().t.bind(getI18n());
            if (job.status === "success" || job.status === "warning") {
              toast.success(t("toast.completed", { ns: "background-job" }), {
                description: job.description ?? undefined,
              });
            } else if (job.status === "error") {
              toast.error(t("toast.failed", { ns: "background-job" }), {
                description:
                  job.description ??
                  t("toast.retryLater", { ns: "background-job" }),
              });
            } else if (job.status === "cancelled") {
              toast.info(t("toast.cancelled", { ns: "background-job" }), {
                description: job.description ?? undefined,
              });
            }
            updateTask(task.id, { notified: true });
          }

          void refreshTasks?.();
        } catch {
          // 网络错误时下次轮询重试
        }
      }
    };

    void poll();
    const timer = setInterval(() => void poll(), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeKey, isAuthenticated, isPlatformAdmin, refreshTasks, updateTask]);
}
