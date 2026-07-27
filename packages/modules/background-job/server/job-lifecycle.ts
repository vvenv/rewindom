
import {
  Prisma,
  type BackgroundJob,
} from "@be-water/server-kernel/generated/prisma/client/client.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { DATABASE_BACKUP_IDLE_TIMEOUT_MS, DATABASE_RESTORE_IDLE_TIMEOUT_MS } from "@be-water/shared";

import { type BackgroundJobDto, type BackgroundJobStatus, type BackgroundJobType } from "../shared/index.js";

import { BackgroundJobCancelledError } from "./background-job-cancelled.error.js";
import {
  DATABASE_BACKUP_MAX_DURATION_MS,
  DATABASE_BACKUP_RESTART_MESSAGE,
  DATABASE_BACKUP_STALE_MESSAGE,
  DATABASE_RESTORE_MAX_DURATION_MS,
  DATABASE_RESTORE_RESTART_MESSAGE,
  DATABASE_RESTORE_STALE_MESSAGE,
  FILE_JOB_RESTART_MESSAGE,
  type JobResult,
} from "./job-types.js";

import type { FastifyBaseLogger } from "fastify";

export function toDto(record: BackgroundJob): BackgroundJobDto {
  return {
    job_id: record.id,
    type: record.type as BackgroundJobType,
    title: record.title,
    status: record.status as BackgroundJobStatus,
    description: record.description,
    result: (record.result as JobResult | null) ?? null,
    created_at: record.created_at.getTime(),
    finished_at: record.finished_at?.getTime() ?? null,
  };
}


export async function getJobRecord(
  jobId: string,
): Promise<BackgroundJob | null> {
  try {
    return await prisma.backgroundJob.findUnique({ where: { id: jobId } });
  } catch {
    return null;
  }
}

export async function createJobRecord(
  userId: string,
  type: BackgroundJobType,
  title: string,
  input?: Prisma.InputJsonValue,
): Promise<BackgroundJob> {
  return prisma.backgroundJob.create({
    data: {
      user_id: userId,
      type,
      title,
      status: "running",
      description: "任务已创建，等待执行…",
      input,
    },
  });
}

export async function updateJob(
  jobId: string,
  patch: {
    status?: BackgroundJobStatus;
    description?: string | null;
    finished_at?: Date | null;
    result?: JobResult | null;
    input?: Prisma.InputJsonValue | null;
  },
): Promise<BackgroundJob | null> {
  const data: Prisma.BackgroundJobUpdateInput = {
    status: patch.status,
    description: patch.description,
    finished_at: patch.finished_at,
  };

  if (patch.result !== undefined) {
    data.result =
      patch.result === null
        ? Prisma.JsonNull
        : (patch.result as unknown as Prisma.InputJsonValue);
  }

  if (patch.input !== undefined) {
    data.input =
      patch.input === null ? Prisma.JsonNull : patch.input;
  }

  try {
    return await prisma.backgroundJob.update({
      where: { id: jobId },
      data,
    });
  } catch {
    return null;
  }
}

export async function isJobCancelled(jobId: string): Promise<boolean> {
  const record = await getJobRecord(jobId);
  return record?.status === "cancelled";
}

export async function throwIfJobCancelled(jobId: string): Promise<void> {
  if (await isJobCancelled(jobId)) {
    throw new BackgroundJobCancelledError();
  }
}

export async function finalizeJobIfRunning(
  jobId: string,
  patch: {
    status?: BackgroundJobStatus;
    description?: string | null;
    finished_at?: Date | null;
    result?: JobResult | null;
  },
): Promise<BackgroundJob | null> {
  if (await isJobCancelled(jobId)) return null;
  return updateJob(jobId, patch);
}

export function isBackgroundJobCancelledError(err: unknown): boolean {
  return err instanceof BackgroundJobCancelledError;
}

export function isFileBackgroundJobStale(record: BackgroundJob): boolean {
  if (record.status !== "running") return false;

  const maxDurationMs =
    record.type === "database_backup" || record.type === "data_backup"
      ? DATABASE_BACKUP_MAX_DURATION_MS
      : record.type === "database_restore" || record.type === "data_restore"
        ? DATABASE_RESTORE_MAX_DURATION_MS
        : null;
  const idleTimeoutMs =
    record.type === "database_backup" || record.type === "data_backup"
      ? DATABASE_BACKUP_IDLE_TIMEOUT_MS
      : record.type === "database_restore" || record.type === "data_restore"
        ? DATABASE_RESTORE_IDLE_TIMEOUT_MS
        : null;

  if (maxDurationMs == null || idleTimeoutMs == null) return false;

  const now = Date.now();
  const lastActivity = record.updated_at.getTime();
  const createdAt = record.created_at.getTime();
  if (now - createdAt > maxDurationMs) return true;
  return now - lastActivity > idleTimeoutMs;
}

export function getStaleFileJobMessage(type: BackgroundJobType): string {
  if (type === "database_backup" || type === "data_backup") {
    return DATABASE_BACKUP_STALE_MESSAGE;
  }
  if (type === "database_restore" || type === "data_restore") {
    return DATABASE_RESTORE_STALE_MESSAGE;
  }
  return "任务已超时，请重试";
}

export function getRestartFileJobMessage(type: BackgroundJobType): string {
  if (type === "database_backup" || type === "data_backup") {
    return DATABASE_BACKUP_RESTART_MESSAGE;
  }
  if (type === "database_restore" || type === "data_restore") {
    return DATABASE_RESTORE_RESTART_MESSAGE;
  }
  return FILE_JOB_RESTART_MESSAGE;
}

export async function failStaleFileBackgroundJob(
  record: BackgroundJob,
): Promise<BackgroundJobDto> {
  const finished_at = new Date();
  const next = await updateJob(record.id, {
    status: "error",
    description: getStaleFileJobMessage(record.type as BackgroundJobType),
    finished_at,
  });
  return toDto(next ?? record);
}

export async function launchBackgroundJob(opts: {
  userId: string;
  type: BackgroundJobType;
  title: string;
  input?: Prisma.InputJsonValue;
  execute: (jobId: string) => Promise<void>;
  logger?: FastifyBaseLogger;
  errorLabel?: string;
}): Promise<BackgroundJobDto> {
  const record = await createJobRecord(
    opts.userId,
    opts.type,
    opts.title,
    opts.input,
  );
  const jobId = record.id;
  runJobInBackground(
    jobId,
    () => opts.execute(jobId),
    opts.logger,
    opts.errorLabel ?? "后台任务",
  );
  return toDto(record);
}

export function runJobInBackground(
  jobId: string,
  execute: () => Promise<void>,
  logger?: FastifyBaseLogger,
  errorLabel = "后台任务",
): void {
  void execute().catch((err) => {
    if (isBackgroundJobCancelledError(err)) return;
    logger?.error(
      { job_id: jobId, err },
      `[background-job] ${errorLabel} 失败`,
    );
    void finalizeJobIfRunning(jobId, {
      status: "error",
      description: err instanceof Error ? err.message : "任务执行失败",
      finished_at: new Date(),
    });
  });
}
