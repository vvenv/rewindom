import { randomBytes } from "node:crypto";
import { type createReadStream } from "node:fs";
import { stat } from "node:fs/promises";

import { getRedisClient } from "@rewindom/server-kernel/infra/redis.service.js";
import { NotFoundError } from "@rewindom/server-kernel/lib/app-errors.js";
import { BACKUP_FILE_PREFIX } from "@rewindom/shared";

import {
  assertCustomDumpFile,
  BackupService,
  getDatabaseBackupFilePath,
} from "./backup.service.js";

const DOWNLOAD_TOKEN_PREFIX = "database_backup_dl:";
const DOWNLOAD_TOKEN_TTL_SECONDS = 120;

export interface DatabaseBackupDownloadTokenPayload {
  job_id: string;
  user_id: string;
}

function downloadTokenKey(token: string): string {
  return `${DOWNLOAD_TOKEN_PREFIX}${token}`;
}

export async function createDatabaseBackupDownloadToken(
  jobId: string,
  userId: string,
): Promise<string> {
  const token = randomBytes(24).toString("hex");
  const payload: DatabaseBackupDownloadTokenPayload = {
    job_id: jobId,
    user_id: userId,
  };
  const client = getRedisClient();
  await client.setex(
    downloadTokenKey(token),
    DOWNLOAD_TOKEN_TTL_SECONDS,
    JSON.stringify(payload),
  );
  return token;
}

export async function consumeDatabaseBackupDownloadToken(
  token: string,
  jobId: string,
): Promise<DatabaseBackupDownloadTokenPayload | null> {
  const client = getRedisClient();
  const key = downloadTokenKey(token);
  const raw = await client.get(key);
  if (!raw) return null;

  await client.del(key);

  try {
    const payload = JSON.parse(raw) as DatabaseBackupDownloadTokenPayload;
    if (payload.job_id !== jobId) return null;
    return payload;
  } catch {
    return null;
  }
}

export function buildDatabaseBackupContentDisposition(
  filename: string,
): string {
  const asciiFallback =
    filename.replace(/[^\x20-\x7E]/g, "_") || `${BACKUP_FILE_PREFIX}_backup.dump`;
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}

export async function openDatabaseBackupFileStream(jobId: string): Promise<{
  stream: ReturnType<typeof createReadStream>;
  size: number;
  filePath: string;
  contentType: string;
}> {
  const dumpPath = getDatabaseBackupFilePath(jobId);
  try {
    await assertCustomDumpFile(dumpPath);
    const fileStat = await stat(dumpPath);
    return {
      stream: BackupService.openBackupReadStream(dumpPath),
      size: fileStat.size,
      filePath: dumpPath,
      contentType: "application/octet-stream",
    };
  } catch {
    // 上游只提供整库备份；租户数据级备份是业务感知能力，留在下游产品仓。
    throw new NotFoundError("platform.backup_missing_or_expired");
  }
}
