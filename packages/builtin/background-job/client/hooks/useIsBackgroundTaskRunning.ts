import { useMemo } from "react";

import { useTaskCenter } from "./useTaskCenter.js";

export function useIsBackgroundTaskRunning(
  titlePrefix?: string,
): boolean {
  const { tasks } = useTaskCenter();

  return useMemo(() => {
    if (!titlePrefix) {
      return false;
    }

    return tasks.some(
      (task) =>
        task.status === "running" && task.title.startsWith(titlePrefix),
    );
  }, [tasks, titlePrefix]);
}
