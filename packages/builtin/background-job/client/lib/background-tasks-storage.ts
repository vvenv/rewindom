import { readPersistedValue, writePersistedValue } from "@be-water/client-kit/lib/persist-storage";
import { STORAGE_PREFIX } from "@be-water/shared";

import type { BackgroundTask } from "../contexts/TaskContext.js";

export const DISMISSED_BACKGROUND_JOB_IDS_KEY =
  `${STORAGE_PREFIX}_dismissed_background_job_ids`;

export const MAX_BACKGROUND_TASKS = 30;

export function loadDismissedJobIds(): Set<string> {
  const ids = readPersistedValue<string[]>({
    key: DISMISSED_BACKGROUND_JOB_IDS_KEY,
    defaultValue: [],
    deserialize: (raw) => {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(
          (item): item is string => typeof item === "string",
        );
      } catch {
        return [];
      }
    },
  });
  return new Set(ids);
}

export function persistDismissedJobIds(ids: Set<string>): void {
  writePersistedValue(
    DISMISSED_BACKGROUND_JOB_IDS_KEY,
    Array.from(ids).slice(0, MAX_BACKGROUND_TASKS * 2),
  );
}

export function filterVisibleTasks(
  tasks: BackgroundTask[],
  dismissedIds: Set<string>,
): BackgroundTask[] {
  return tasks
    .filter(
      (task) =>
        task.status === "running" ||
        !dismissedIds.has(task.serverJobId ?? task.id),
    )
    .slice(0, MAX_BACKGROUND_TASKS);
}

/** 服务端仍在运行的任务不应被「移除/清除已完成」长期隐藏。 */
export function pruneDismissedIdsForRunningTasks(
  dismissedIds: Set<string>,
  tasks: BackgroundTask[],
): Set<string> {
  const next = new Set(dismissedIds);
  for (const task of tasks) {
    if (task.status !== "running") continue;
    next.delete(task.serverJobId ?? task.id);
  }
  return next;
}
