import { type BackgroundJobDto } from "../../shared/index.js";

import type {
  BackgroundTask,
  BackgroundTaskStatus,
} from "../contexts/TaskContext.js";

export function mapJobStatusToTaskStatus(
  status: BackgroundJobDto["status"],
): BackgroundTaskStatus {
  if (status === "success") return "success";
  if (status === "warning") return "warning";
  if (status === "error") return "error";
  if (status === "cancelled") return "interrupted";
  return "running";
}

export function extractJobErrorDetails(job: BackgroundJobDto): string[] | undefined {
  if (job.status !== "error" && job.status !== "warning") {
    return undefined;
  }
  return job.description ? [job.description] : undefined;
}

export function jobDtoToBackgroundTask(job: BackgroundJobDto): BackgroundTask {
  const fileResult =
    job.type === "database_backup" || job.type === "data_backup"
      ? (job.result as { filename?: string } | null)
      : null;

  return {
    id: job.job_id,
    serverJobId: job.job_id,
    title: job.title,
    description: job.description ?? undefined,
    status: mapJobStatusToTaskStatus(job.status),
    createdAt: job.created_at,
    finishedAt: job.finished_at ?? undefined,
    notified: job.status !== "running",
    exportFilename: fileResult?.filename,
    errorDetails: extractJobErrorDetails(job),
  };
}

export function getTaskErrorDetails(task: BackgroundTask): string[] {
  return task.errorDetails ?? [];
}

export function getTaskSkipDetails(task: BackgroundTask) {
  return task.skipDetails;
}
