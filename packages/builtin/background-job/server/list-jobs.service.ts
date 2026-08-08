import { prisma } from "@be-water/server-kernel/lib/prisma.js";

import { type BackgroundJobDto, type BackgroundJobType } from "../shared/index.js";


import {
  getDatabaseRestoreJobSnapshot,
  listDatabaseRestoreJobSnapshots,
} from "./database-restore-job-store.service.js";
import {
  failStaleFileBackgroundJob,
  getJobRecord,
  getRestartFileJobMessage,
  isFileBackgroundJobStale,
  toDto,
  updateJob,
} from "./job-lifecycle.js";
import {
  DATABASE_RESTORE_INVALIDATED_JOBS_MESSAGE,
  LIST_JOBS_DEFAULT_LIMIT,
} from "./job-types.js";

import type { FastifyBaseLogger } from "fastify";

export async function failRunningBackgroundJobsAfterDatabaseRestore(): Promise<number> {
  const finished_at = new Date();
  const result = await prisma.backgroundJob.updateMany({
    where: { status: "running" },
    data: {
      status: "error",
      description: DATABASE_RESTORE_INVALIDATED_JOBS_MESSAGE,
      finished_at,
    },
  });
  return result.count;
}

export async function failOrphanedFileJobsOnStartup(
  logger?: FastifyBaseLogger,
): Promise<number> {
  const runningJobs = await prisma.backgroundJob.findMany({
    where: {
      type: {
        in: [
          "database_backup",
          "database_restore",
          "data_backup",
          "data_restore",
        ],
      },
      status: "running",
    },
  });

  let failed = 0;
  const finished_at = new Date();

  for (const record of runningJobs) {
    await updateJob(record.id, {
      status: "error",
      description: getRestartFileJobMessage(record.type as BackgroundJobType),
      finished_at,
    });
    failed++;
  }

  if (failed > 0) {
    logger?.warn(
      { count: failed },
      "[background-job] 启动后将孤儿文件类后台任务标记为失败",
    );
  }
  return failed;
}

export async function listBackgroundJobsForUser(
  userId: string,
  limit = LIST_JOBS_DEFAULT_LIMIT,
): Promise<BackgroundJobDto[]> {
  const restoreJobs = await listDatabaseRestoreJobSnapshots(userId);
  const restoreJobIds = new Set(restoreJobs.map((job) => job.job_id));

  let records: Awaited<ReturnType<typeof prisma.backgroundJob.findMany>>;
  try {
    records = await prisma.backgroundJob.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      take: limit,
    });
  } catch {
    return restoreJobs.slice(0, limit);
  }

  const result: BackgroundJobDto[] = [...restoreJobs];
  for (const record of records) {
    if (restoreJobIds.has(record.id)) continue;
    if (isFileBackgroundJobStale(record)) {
      result.push(await failStaleFileBackgroundJob(record));
    } else {
      result.push(toDto(record));
    }
  }

  result.sort((a, b) => b.created_at - a.created_at);
  return result.slice(0, limit);
}

export async function getBackgroundJobForUser(
  jobId: string,
  userId: string,
): Promise<BackgroundJobDto | null> {
  const restoreJob = await getDatabaseRestoreJobSnapshot(jobId, userId);
  if (restoreJob) return restoreJob;

  const record = await getJobRecord(jobId);
  if (!record || record.user_id !== userId) return null;
  if (isFileBackgroundJobStale(record)) {
    return failStaleFileBackgroundJob(record);
  }
  return toDto(record);
}

export type CancelBackgroundJobResult =
  | BackgroundJobDto
  | "not_found"
  | "not_running";

export async function cancelBackgroundJobForUser(
  jobId: string,
  userId: string,
): Promise<CancelBackgroundJobResult> {
  const record = await getJobRecord(jobId);
  if (!record || record.user_id !== userId) {
    return "not_found";
  }
  if (record.status !== "running") {
    return toDto(record);
  }

  const next = await updateJob(jobId, {
    status: "cancelled",
    description: "任务已取消",
    finished_at: new Date(),
  });
  return next ? toDto(next) : "not_found";
}
