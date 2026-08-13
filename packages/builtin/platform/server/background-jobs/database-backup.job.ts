import { type BackgroundJob } from "@rewindom/server-kernel/generated/prisma/client/client.js";
import { config } from "@rewindom/server-kernel/lib/config.js";
import { emitDetachedAuditLogSafe } from "@rewindom/server-kernel/runtime/audit-log-emit.js";

import { AuditAction } from "../../../audit/shared/index.js";
import {
  finalizeJobIfRunning,
  getJobRecord,
  isBackgroundJobCancelledError,
  launchBackgroundJob,
  throwIfJobCancelled,
  updateJob,
} from "../../../background-job/server/job-lifecycle.js";
import {
  type BackgroundJobDto,
  type DatabaseBackupJobResult,
} from "../../../background-job/shared/index.js";
import {
  assertCustomDumpFile,
  BackupService,
} from "../services/backup.service.js";

import type { FastifyBaseLogger } from "fastify";

export async function startDatabaseBackupBackgroundJob(
  userId: string,
  username: string,
  title: string,
  logger?: FastifyBaseLogger,
): Promise<BackgroundJobDto | "misconfigured"> {
  const databaseUrl = config.database.url;
  if (!databaseUrl) {
    return "misconfigured";
  }

  return launchBackgroundJob({
    userId,
    type: "database_backup",
    title,
    execute: (jobId) =>
      executeDatabaseBackupJob(jobId, userId, username, databaseUrl, logger),
    logger,
    errorLabel: "数据库备份",
  });
}

async function executeDatabaseBackupJob(
  jobId: string,
  userId: string,
  username: string,
  databaseUrl: string,
  logger?: FastifyBaseLogger,
): Promise<void> {
  try {
    await throwIfJobCancelled(jobId);
    await updateJob(jobId, { description: "正在执行 pg_dump（custom 格式）…" });

    const built = await BackupService.generateBackupToFile(databaseUrl, jobId);
    await throwIfJobCancelled(jobId);
    await assertCustomDumpFile(built.filePath);

    logger?.info(
      { job_id: jobId, path: built.filePath, size_bytes: built.size_bytes },
      "[background-job] 数据库备份文件就绪",
    );

    await emitDetachedAuditLogSafe(logger, {
      userId,
      username,
      action: AuditAction.BACKUP_DATABASE,
      resource: "database",
      detail_key: "platform.audit.database_backed_up",
      detail_params: { filename: built.filename },
    });

    const result: DatabaseBackupJobResult = {
      file_path: built.filePath,
      file_size_bytes: built.size_bytes,
      duration_ms: 0,
      filename: built.filename,
      size_bytes: built.size_bytes,
    };

    await finalizeJobIfRunning(jobId, {
      status: "success",
      description: `备份已完成（${(built.size_bytes / (1024 * 1024)).toFixed(2)} MB）`,
      result,
      finished_at: new Date(),
    });
  } catch (err) {
    if (isBackgroundJobCancelledError(err)) return;
    await finalizeJobIfRunning(jobId, {
      status: "error",
      description: err instanceof Error ? err.message : "备份失败",
      finished_at: new Date(),
    });
  }
}

export async function getDatabaseBackupJobForUser(
  jobId: string,
  userId: string,
): Promise<BackgroundJob | null> {
  const record = await getJobRecord(jobId);
  if (
    !record ||
    record.user_id !== userId ||
    record.type !== "database_backup"
  ) {
    return null;
  }
  return record;
}
