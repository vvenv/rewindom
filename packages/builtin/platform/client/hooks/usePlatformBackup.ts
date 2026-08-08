import { useCallback, useMemo } from "react";

import { api } from "@be-water/client-kit";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchBackgroundJobsList } from "../../../background-job/client/hooks/useBackgroundJobsList.js";
import { type BackgroundJobDto, DATABASE_BACKUP_TASK_TITLE_PREFIX  } from "../../../background-job/shared/index.js";

const PLATFORM_JOBS_KEY = ["platform", "background-jobs"] as const;

export { PLATFORM_JOBS_KEY };

export async function downloadPlatformDatabaseBackup(
  jobId: string,
): Promise<void> {
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

export function usePlatformBackup(options?: { keepPolling?: boolean }) {
  const queryClient = useQueryClient();

  const { data: jobs } = useQuery({
    queryKey: PLATFORM_JOBS_KEY,
    queryFn: () => fetchBackgroundJobsList(true),
    refetchInterval: (query) => {
      if (options?.keepPolling) {
        return 2000;
      }
      const list = query.state.data;
      const hasRunningJob = list?.some(
        (job) =>
          (job.type === "database_backup" || job.type === "database_restore") &&
          job.status === "running",
      );
      return hasRunningJob ? 2000 : false;
    },
  });

  const latestBackupJob = useMemo(() => {
    return jobs?.find((job) => job.type === "database_backup");
  }, [jobs]);

  const isBackupRunning = useMemo(
    () =>
      jobs?.some(
        (job) => job.type === "database_backup" && job.status === "running",
      ) ?? false,
    [jobs],
  );

  const latestRestoreJob = useMemo(() => {
    return jobs?.find((job) => job.type === "database_restore");
  }, [jobs]);

  const isRestoreRunning = useMemo(
    () =>
      jobs?.some(
        (job) => job.type === "database_restore" && job.status === "running",
      ) ?? false,
    [jobs],
  );

  const startBackup = useCallback(async () => {
    await api.post<BackgroundJobDto>("/platform/database-backup", {
      title: DATABASE_BACKUP_TASK_TITLE_PREFIX,
    });
    await queryClient.invalidateQueries({ queryKey: PLATFORM_JOBS_KEY });
  }, [queryClient]);

  return {
    jobs,
    latestBackupJob,
    isBackupRunning,
    latestRestoreJob,
    isRestoreRunning,
    startBackup,
  };
}
