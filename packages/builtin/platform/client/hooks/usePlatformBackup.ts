import { api } from "@be-water/client-kit";
import { useQuery } from "@tanstack/react-query";

import { sortLocalRestoreCandidates } from "../lib/backup-restore.js";

import type {
  BackgroundJobStartedResponse,
  LocalRestoreCandidate,
  LocalRestoreCandidatesResponse,
} from "../../shared/index.js";

export const PLATFORM_LOCAL_RESTORE_CANDIDATES_KEY = [
  "platform",
  "restore",
  "local-candidates",
] as const;

/**
 * 白名单目录下的可还原文件。
 *
 * `enabled` 留给调用方：这份列表只在还原抽屉打开时才有意义，平时不必扫盘。
 */
export function usePlatformLocalRestoreCandidates(enabled = true) {
  return useQuery({
    queryKey: PLATFORM_LOCAL_RESTORE_CANDIDATES_KEY,
    queryFn: async (): Promise<LocalRestoreCandidate[]> => {
      const { candidates } = await api.get<LocalRestoreCandidatesResponse>(
        "/platform/restore/local-candidates",
      );
      return sortLocalRestoreCandidates(candidates);
    },
    enabled,
  });
}

/**
 * 备份 / 还原的发起动作。
 *
 * 三个都返回 `job_id` 而不是等结果——它们是后台任务，调用方把返回值交给
 * `runServerBackedTask` 接管轮询与任务中心展示。
 */
export function usePlatformBackupActions() {
  return {
    startBackup: (title: string): Promise<BackgroundJobStartedResponse> =>
      api.post<BackgroundJobStartedResponse>("/platform/database-backup", {
        title,
      }),

    startLocalRestore: (
      filePath: string,
    ): Promise<BackgroundJobStartedResponse> =>
      api.post<BackgroundJobStartedResponse>("/platform/restore/local", {
        file_path: filePath,
      }),

    startUploadRestore: (file: File): Promise<BackgroundJobStartedResponse> => {
      const formData = new FormData();
      formData.append("file", file);
      return api.upload<BackgroundJobStartedResponse>(
        "/platform/restore",
        formData,
      );
    },
  };
}
