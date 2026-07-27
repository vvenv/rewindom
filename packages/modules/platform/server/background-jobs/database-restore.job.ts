
import {
  type BackgroundJob,
  type Prisma,
} from "@be-water/server-kernel/generated/prisma/client/client.js";
import { config } from "@be-water/server-kernel/lib/config.js";
import { emitDetachedAuditLogSafe } from "@be-water/server-kernel/runtime/audit-log-emit.js";

import { AuditAction } from "../../../audit/shared/index.js";
import {
  patchDatabaseRestoreJobSnapshot,
  saveDatabaseRestoreJobSnapshot,
} from "../../../background-job/server/database-restore-job-store.service.js";
import {
  getJobRecord,
  isBackgroundJobCancelledError,
  launchBackgroundJob,
  throwIfJobCancelled,
  updateJob,
} from "../../../background-job/server/job-lifecycle.js";
import { failRunningBackgroundJobsAfterDatabaseRestore } from "../../../background-job/server/list-jobs.service.js";
import { type BackgroundJobDto } from "../../../background-job/shared/index.js";
import { BackupService } from "../services/backup.service.js";

import type { FastifyBaseLogger } from "fastify";

export interface DatabaseRestoreJobInput {
  source_file_path: string;
  original_filename: string;
  delete_source_after_restore: boolean;
}

export interface StartDatabaseRestoreOptions {
  deleteSourceAfterRestore?: boolean;
}

export async function startDatabaseRestoreBackgroundJob(
  userId: string,
  username: string,
  sourceFilePath: string,
  originalFilename: string,
  options: StartDatabaseRestoreOptions = {},
  logger?: FastifyBaseLogger,
): Promise<BackgroundJobDto> {
  const databaseUrl = config.database.url;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL 未配置");
  }

  const input: DatabaseRestoreJobInput = {
    source_file_path: sourceFilePath,
    original_filename: originalFilename,
    delete_source_after_restore: options.deleteSourceAfterRestore ?? false,
  };

  const job = await launchBackgroundJob({
    userId,
    type: "database_restore",
    title: `数据还原：${originalFilename}`,
    input: input as unknown as Prisma.InputJsonValue,
    execute: (jobId) =>
      executeDatabaseRestoreJob(
        jobId,
        userId,
        username,
        databaseUrl,
        input,
        logger,
      ),
    logger,
    errorLabel: "数据库还原",
  });
  await saveDatabaseRestoreJobSnapshot(userId, job);
  return job;
}

async function syncDatabaseRestoreJobState(
  jobId: string,
  patch: {
    status?: "running" | "success" | "error" | "cancelled";
    description?: string | null;
    finished_at?: Date | null;
  },
): Promise<void> {
  await updateJob(jobId, patch);

  const snapshotPatch: Parameters<typeof patchDatabaseRestoreJobSnapshot>[1] =
    {};
  if (patch.status !== undefined) {
    snapshotPatch.status = patch.status;
  }
  if (patch.description !== undefined) {
    snapshotPatch.description = patch.description;
  }
  if (patch.finished_at !== undefined) {
    snapshotPatch.finished_at = patch.finished_at?.getTime() ?? null;
  }
  await patchDatabaseRestoreJobSnapshot(jobId, snapshotPatch);
}

async function executeDatabaseRestoreJob(
  jobId: string,
  userId: string,
  username: string,
  databaseUrl: string,
  input: DatabaseRestoreJobInput,
  logger?: FastifyBaseLogger,
): Promise<void> {
  try {
    await throwIfJobCancelled(jobId);
    await syncDatabaseRestoreJobState(jobId, {
      description: "正在还原数据库（pg_restore）…",
    });

    await BackupService.restoreBackupFromFile(
      databaseUrl,
      input.source_file_path,
    );

    await throwIfJobCancelled(jobId);

    const invalidatedCount =
      await failRunningBackgroundJobsAfterDatabaseRestore();
    if (invalidatedCount > 0) {
      logger?.info(
        { count: invalidatedCount },
        "[background-job] 数据库还原后已将残留 running 任务标记为失效",
      );
    }

    await emitDetachedAuditLogSafe(logger, {
        userId,
        username,
        action: AuditAction.RESTORE_DATABASE,
        resource: "database",
        details: `从备份恢复：${input.original_filename}`,
      })

    await syncDatabaseRestoreJobState(jobId, {
      status: "success",
      description: "数据库还原完成",
      finished_at: new Date(),
    });
  } catch (err) {
    if (isBackgroundJobCancelledError(err)) return;
    await syncDatabaseRestoreJobState(jobId, {
      status: "error",
      description: err instanceof Error ? err.message : "还原失败",
      finished_at: new Date(),
    });
  } finally {
    if (input.delete_source_after_restore) {
      const { unlink } = await import("node:fs/promises");
      await unlink(input.source_file_path).catch(() => undefined);
    }
  }
}

export async function getDatabaseRestoreJobForUser(
  jobId: string,
  userId: string,
): Promise<BackgroundJob | null> {
  const record = await getJobRecord(jobId);
  if (
    !record ||
    record.user_id !== userId ||
    record.type !== "database_restore"
  ) {
    return null;
  }
  return record;
}
