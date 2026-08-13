import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { api, getI18n, useAuth } from "@rewindom/client-kit";
import { isPlatformAdminActor } from "@rewindom/shared";
import { toast } from "@rewindom/ui/toast";

import { type BackgroundJobDto, isDownloadableBackgroundTask  } from "../../shared/index.js";
import { useBackgroundJobsList } from "../hooks/useBackgroundJobsList.js";
import { useServerJobPoller } from "../hooks/useServerJobPoller.js";
import {
  jobDtoToBackgroundTask,
  mapJobStatusToTaskStatus,
} from "../lib/background-jobs.js";
import {
  filterVisibleTasks,
  loadDismissedJobIds,
  MAX_BACKGROUND_TASKS,
  persistDismissedJobIds,
  pruneDismissedIdsForRunningTasks,
} from "../lib/background-tasks-storage.js";

export type BackgroundTaskStatus =
  "running" | "success" | "warning" | "error" | "interrupted";

export interface BackgroundTask {
  id: string;
  /** 服务端后台任务 ID，刷新后仍可轮询状态 */
  serverJobId?: string;
  title: string;
  description?: string;
  status: BackgroundTaskStatus;
  createdAt: number;
  finishedAt?: number;
  /** 是否已弹出完成/失败通知 */
  notified?: boolean;
  exportFilename?: string;
  exportFileDownloaded?: boolean;
  /** 任务失败或部分失败时的错误明细 */
  errorDetails?: string[];
  skipDetails?: {
    summary?: Array<{ reason: string; count: number }>;
    details?: string[];
    truncated?: boolean;
  };
  /**
   * 业务模块自定义的运行时进度。
   *
   * 壳层不解释其内容——形状由业务模块定义，业务侧通过自己的访问器读取。
   */
  moduleProgress?: object;
}

export interface RunBackgroundTaskOptions<T> {
  title: string;
  run: (onProgress: (description: string) => void) => Promise<T>;
  onSuccess?: (result: T) => {
    toastTitle: string;
    toastDescription?: string;
    status?: "success" | "warning";
  };
  onError?: (error: unknown) => {
    toastTitle: string;
    toastDescription?: string;
  };
}

export interface RunServerBackedTaskOptions {
  title: string;
  /** @param taskId 本地任务 ID，可用于上传等长耗时阶段更新进度 */
  startJob: (taskId: string) => Promise<{ job_id: string }>;
}

export type ActivityCenterTab = "alerts" | "tasks";

export interface TaskContextValue {
  tasks: BackgroundTask[];
  runningCount: number;
  badgeCount: number;
  taskCenterOpen: boolean;
  setTaskCenterOpen: (open: boolean) => void;
  activityCenterTab: ActivityCenterTab;
  setActivityCenterTab: (tab: ActivityCenterTab) => void;
  openTaskCenter: () => void;
  runTask: <T>(options: RunBackgroundTaskOptions<T>) => string;
  runServerBackedTask: (options: RunServerBackedTaskOptions) => string;
  updateTask: (id: string, patch: Partial<BackgroundTask>) => void;
  dismissTask: (id: string) => void;
  cancelTask: (id: string) => void;
  clearFinished: () => void;
  refreshTasks: () => Promise<void>;
}

export const TaskContext = createContext<TaskContextValue | undefined>(
  undefined,
);

function createTaskId(): string {
  return crypto.randomUUID();
}

function mergeTasks(
  serverTasks: BackgroundTask[],
  localTasks: BackgroundTask[],
): BackgroundTask[] {
  const byId = new Map<string, BackgroundTask>();

  for (const task of serverTasks) {
    byId.set(task.id, task);
  }

  for (const task of localTasks) {
    const existing = byId.get(task.id);
    if (!existing) {
      byId.set(task.id, task);
      continue;
    }
    byId.set(task.id, {
      ...existing,
      ...task,
      notified: task.notified ?? existing.notified,
      exportFileDownloaded:
        task.exportFileDownloaded ?? existing.exportFileDownloaded,
      errorDetails: task.errorDetails ?? existing.errorDetails,
      moduleProgress: task.moduleProgress ?? existing.moduleProgress,
    });
  }

  return Array.from(byId.values())
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, MAX_BACKGROUND_TASKS);
}

interface TaskProviderProps {
  children: ReactNode;
}

export function TaskProvider({ children }: TaskProviderProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const isPlatformAdmin =
    user !== null && isPlatformAdminActor(user.actor_type);
  const backgroundTasksEnabled = isAuthenticated && !isLoading && user !== null;
  const { data: backgroundJobs, refetch: refetchBackgroundJobs } =
    useBackgroundJobsList({
      enabled: backgroundTasksEnabled,
      isPlatformAdmin,
    });
  const [tasks, setTasksState] = useState<BackgroundTask[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() =>
    loadDismissedJobIds(),
  );
  const [taskCenterOpen, setTaskCenterOpen] = useState(false);
  const [activityCenterTab, setActivityCenterTab] =
    useState<ActivityCenterTab>("alerts");
  const dismissedIdsRef = useRef(dismissedIds);

  useEffect(() => {
    dismissedIdsRef.current = dismissedIds;
  }, [dismissedIds]);

  const visibleTasks = useMemo(
    () => filterVisibleTasks(backgroundTasksEnabled ? tasks : [], dismissedIds),
    [tasks, dismissedIds, backgroundTasksEnabled],
  );

  const setTasks = useCallback(
    (
      updater:
        BackgroundTask[] | ((prev: BackgroundTask[]) => BackgroundTask[]),
    ) => {
      setTasksState((prev) =>
        typeof updater === "function" ? updater(prev) : updater,
      );
    },
    [],
  );

  const syncTasksFromServer = useCallback(
    (jobs: BackgroundJobDto[]) => {
      const serverTasks = jobs.map(jobDtoToBackgroundTask);
      setDismissedIds((prev) => {
        const next = pruneDismissedIdsForRunningTasks(prev, serverTasks);
        if (next.size === prev.size) {
          return prev;
        }
        persistDismissedJobIds(next);
        return next;
      });
      setTasks((prev) => mergeTasks(serverTasks, prev));
    },
    [setTasks],
  );

  const refreshTasks = useCallback(async (): Promise<void> => {
    if (!backgroundTasksEnabled) {
      return;
    }

    await refetchBackgroundJobs();
  }, [backgroundTasksEnabled, refetchBackgroundJobs]);

  useEffect(() => {
    if (!backgroundJobs) {
      return;
    }

    syncTasksFromServer(backgroundJobs);
  }, [backgroundJobs, syncTasksFromServer]);

  useEffect(() => {
    if (!taskCenterOpen || !backgroundTasksEnabled) {
      return;
    }

    void refetchBackgroundJobs();
  }, [taskCenterOpen, backgroundTasksEnabled, refetchBackgroundJobs]);

  const updateTask = useCallback(
    (id: string, patch: Partial<BackgroundTask>) => {
      setTasks((prev) =>
        prev.map((task) => (task.id === id ? { ...task, ...patch } : task)),
      );
    },
    [setTasks],
  );

  const openTaskCenter = useCallback(() => {
    setActivityCenterTab("tasks");
    setTaskCenterOpen(true);
  }, []);

  useServerJobPoller({
    tasks: visibleTasks,
    updateTask,
    refreshTasks,
  });

  const runServerBackedTask = useCallback(
    (options: RunServerBackedTaskOptions): string => {
      const id = createTaskId();
      const createdAt = Date.now();

      setTasks((prev) => {
        const next: BackgroundTask[] = [
          {
            id,
            title: options.title,
            status: "running",
            createdAt,
            description: getI18n().t("toast.submitting", {
              ns: "background-job",
            }),
            notified: false,
          },
          ...prev,
        ];
        return next.slice(0, MAX_BACKGROUND_TASKS);
      });

      void (async () => {
        const t = getI18n().t.bind(getI18n());
        try {
          const { job_id } = await options.startJob(id);
          updateTask(id, {
            id: job_id,
            serverJobId: job_id,
            description: t("toast.submitted", { ns: "background-job" }),
          });
          await refreshTasks();
        } catch (error) {
          const finishedAt = Date.now();
          const toastDescription =
            error instanceof Error
              ? error.message
              : t("toast.retryLater", { ns: "background-job" });

          updateTask(id, {
            status: "error",
            description: toastDescription,
            finishedAt,
            notified: true,
          });

          toast.error(t("toast.submitFailed", { ns: "background-job" }), {
            description: toastDescription,
          });
        }
      })();

      return id;
    },
    [setTasks, updateTask, refreshTasks],
  );

  const runTask = useCallback(
    <T,>(options: RunBackgroundTaskOptions<T>): string => {
      const id = createTaskId();
      const createdAt = Date.now();

      setTasks((prev) => {
        const next: BackgroundTask[] = [
          {
            id,
            title: options.title,
            status: "running",
            createdAt,
          },
          ...prev,
        ];
        return next.slice(0, MAX_BACKGROUND_TASKS);
      });

      void (async () => {
        try {
          const result = await options.run((description) => {
            updateTask(id, { description });
          });

          const finishedAt = Date.now();
          const successMeta = options.onSuccess?.(result);
          const status = successMeta?.status ?? "success";

          updateTask(id, {
            status,
            description: successMeta?.toastDescription,
            finishedAt,
            notified: true,
          });

          if (successMeta) {
            const toastFn =
              status === "warning" ? toast.warning : toast.success;
            toastFn(successMeta.toastTitle, {
              description: successMeta.toastDescription,
            });
          }
        } catch (error) {
          const finishedAt = Date.now();
          const t = getI18n().t.bind(getI18n());
          const errorMeta = options.onError?.(error) ?? {
            toastTitle: t("toast.failed", { ns: "background-job" }),
            toastDescription:
              error instanceof Error
                ? error.message
                : t("toast.retryLater", { ns: "background-job" }),
          };

          updateTask(id, {
            status: "error",
            description: errorMeta.toastDescription,
            finishedAt,
            notified: true,
          });

          toast.error(errorMeta.toastTitle, {
            description: errorMeta.toastDescription,
          });
        }
      })();

      return id;
    },
    [updateTask, setTasks],
  );

  const dismissTask = useCallback(
    (id: string) => {
      const task = tasks.find((item) => item.id === id);
      const jobId = task?.serverJobId ?? id;
      setDismissedIds((prev) => {
        const next = new Set(prev);
        next.add(jobId);
        persistDismissedJobIds(next);
        return next;
      });
    },
    [tasks],
  );

  const cancelTask = useCallback(
    (id: string) => {
      const task = tasks.find((item) => item.id === id);
      if (!task || task.status !== "running") return;

      const t = getI18n().t.bind(getI18n());
      if (!task.serverJobId) {
        updateTask(id, {
          status: "interrupted",
          description: t("toast.cancelled", { ns: "background-job" }),
          finishedAt: Date.now(),
          notified: true,
        });
        return;
      }

      updateTask(id, {
        description: t("toast.cancelling", { ns: "background-job" }),
      });

      const cancelPath = isPlatformAdmin
        ? `/platform/background-jobs/${task.serverJobId}/cancel`
        : `/background-jobs/${task.serverJobId}/cancel`;

      void (async () => {
        try {
          const job = await api.post<BackgroundJobDto>(cancelPath, {});
          updateTask(id, {
            status: mapJobStatusToTaskStatus(job.status),
            description:
              job.description ??
              t("toast.cancelled", { ns: "background-job" }),
            finishedAt: job.finished_at ?? Date.now(),
            notified: true,
          });
          void refreshTasks();
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : t("toast.retryLater", { ns: "background-job" });
          updateTask(id, { description: message });
          toast.error(t("toast.cancelFailed", { ns: "background-job" }), {
            description: message,
          });
        }
      })();
    },
    [tasks, updateTask, refreshTasks, isPlatformAdmin],
  );

  const clearFinished = useCallback(() => {
    const finishedJobIds = tasks
      .filter((task) => task.status !== "running")
      .map((task) => task.serverJobId ?? task.id);

    setDismissedIds((prev) => {
      const next = new Set(prev);
      for (const jobId of finishedJobIds) {
        next.add(jobId);
      }
      persistDismissedJobIds(next);
      return next;
    });
  }, [tasks]);

  const runningCount = useMemo(
    () => visibleTasks.filter((task) => task.status === "running").length,
    [visibleTasks],
  );

  const pendingDownloadCount = useMemo(
    () =>
      visibleTasks.filter(
        (task) =>
          isDownloadableBackgroundTask(task) &&
          (task.status === "success" || task.status === "warning") &&
          task.exportFileDownloaded !== true,
      ).length,
    [visibleTasks],
  );

  const badgeCount = runningCount + pendingDownloadCount;

  const value = useMemo(
    () => ({
      tasks: visibleTasks,
      runningCount,
      badgeCount,
      taskCenterOpen,
      setTaskCenterOpen,
      activityCenterTab,
      setActivityCenterTab,
      openTaskCenter,
      runTask,
      runServerBackedTask,
      updateTask,
      dismissTask,
      cancelTask,
      clearFinished,
      refreshTasks,
    }),
    [
      visibleTasks,
      runningCount,
      badgeCount,
      taskCenterOpen,
      activityCenterTab,
      setActivityCenterTab,
      openTaskCenter,
      runTask,
      runServerBackedTask,
      updateTask,
      dismissTask,
      cancelTask,
      clearFinished,
      refreshTasks,
    ],
  );

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}
