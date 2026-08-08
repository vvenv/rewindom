import { exec } from "child_process";
import { open, rename, unlink, mkdtemp, mkdir, stat } from "fs/promises";
import { createReadStream } from "node:fs";
import { dirname, join } from "path";
import { promisify } from "util";

import { AppError } from "@be-water/server-kernel/lib/app-errors.js";
import { config } from "@be-water/server-kernel/lib/config.js";
import { createModuleLogger } from "@be-water/server-kernel/lib/logger.js";
import { BACKUP_FILE_PREFIX } from "@be-water/shared";

const log = createModuleLogger("backup");

const execAsync = promisify(exec);

export const BACKUP_FILE_EXT = ".dump";
const CUSTOM_DUMP_MAGIC = "PGDMP";
const MIN_BACKUP_FILE_BYTES = 50;

export function getDatabaseBackupDir(): string {
  return config.storage.export.databaseBackup.dir;
}

export function getDatabaseBackupFilePath(jobId: string): string {
  return join(getDatabaseBackupDir(), `${jobId}${BACKUP_FILE_EXT}`);
}

/** pg_dump/pg_restore 临时目录与成品备份同盘，避免 /tmp tmpfs 空间不足。 */
async function createBackupTempDir(prefix: string): Promise<string> {
  const tempBase = join(getDatabaseBackupDir(), ".tmp");
  await mkdir(tempBase, { recursive: true });
  return mkdtemp(join(tempBase, prefix));
}

function cleanDatabaseUrl(databaseUrl: string): string {
  return databaseUrl.split("?")[0]!;
}

function buildPgDumpCustomCommand(
  cleanUrl: string,
  outputPath: string,
): string {
  const compressLevel = config.database.backup.pgDumpCompressLevel;
  return `pg_dump "${cleanUrl}" --format=custom --no-owner --no-acl --compress=${compressLevel} -f "${outputPath}"`;
}

async function readFilePrefix(
  filePath: string,
  length: number,
): Promise<Buffer> {
  const handle = await open(filePath, "r");
  try {
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buffer, 0, length, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

export async function assertCustomDumpFile(filePath: string): Promise<void> {
  const fileStat = await stat(filePath);
  if (fileStat.size < MIN_BACKUP_FILE_BYTES) {
    throw new AppError({ code: "platform.backup_failed", status: 500 });
  }

  const header = await readFilePrefix(filePath, 5);
  if (header.toString("utf8", 0, 5) !== CUSTOM_DUMP_MAGIC) {
    throw new AppError({ code: "platform.backup_failed", status: 400 });
  }
}

async function resetPublicSchema(cleanUrl: string): Promise<void> {
  await execAsync(
    `psql "${cleanUrl}" -v ON_ERROR_STOP=1 -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"`,
    { maxBuffer: 10 * 1024 * 1024 },
  );
}

async function execPgRestore(command: string): Promise<void> {
  try {
    await execAsync(command, { maxBuffer: 50 * 1024 * 1024 });
  } catch (error) {
    const exitCode =
      error && typeof error === "object" && "code" in error
        ? Number((error as { code?: number }).code)
        : undefined;
    // pg_restore --clean 常因 DROP IF EXISTS 警告以 exit 1 结束，仍视为成功
    if (exitCode === 1) {
      return;
    }
    throw error;
  }
}

async function restoreCustomDump(
  cleanUrl: string,
  dumpPath: string,
): Promise<void> {
  const parallelJobs = config.database.restore.parallelJobs;
  const command = `pg_restore --no-owner --no-acl --clean --if-exists -j ${parallelJobs} -d "${cleanUrl}" "${dumpPath}"`;
  await execPgRestore(command);
}

export class BackupService {
  static async generateBackupToFile(
    databaseUrl: string,
    jobId: string,
  ): Promise<{ filename: string; filePath: string; size_bytes: number }> {
    const maskedUrl = databaseUrl.replace(/:[^:@]+@/, ":****@");
    log.info({ databaseUrl: maskedUrl }, "开始生成备份");

    const filename = `${BACKUP_FILE_PREFIX}_backup_${Date.now()}${BACKUP_FILE_EXT}`;
    const filePath = getDatabaseBackupFilePath(jobId);
    const cleanUrl = cleanDatabaseUrl(databaseUrl);
    const tempDir = await createBackupTempDir(`${BACKUP_FILE_PREFIX}-backup-`);
    const tempFile = join(tempDir, "backup.dump");
    const command = buildPgDumpCustomCommand(cleanUrl, tempFile);

    try {
      await mkdir(dirname(filePath), { recursive: true });
      await execAsync(command, { maxBuffer: 10 * 1024 * 1024 });
      const tempStat = await stat(tempFile);
      if (tempStat.size < MIN_BACKUP_FILE_BYTES) {
        throw new AppError({ code: "platform.backup_failed", status: 500 });
      }
      await rename(tempFile, filePath);
      const fileStat = await stat(filePath);
      return { filename, filePath, size_bytes: fileStat.size };
    } catch (error) {
      await unlink(filePath).catch(() => undefined);
      if (error instanceof AppError) throw error;
      throw new AppError({ code: "platform.backup_failed", status: 500 });
    } finally {
      try {
        await unlink(tempFile);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  static async restoreBackupFromFile(
    databaseUrl: string,
    backupFilePath: string,
  ): Promise<void> {
    const maskedUrl = databaseUrl.replace(/:[^:@]+@/, ":****@");
    log.info({ databaseUrl: maskedUrl, backupFilePath }, "开始恢复备份");

    const cleanUrl = cleanDatabaseUrl(databaseUrl);

    try {
      await assertCustomDumpFile(backupFilePath);
      await resetPublicSchema(cleanUrl);
      await restoreCustomDump(cleanUrl, backupFilePath);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError({ code: "platform.restore_failed", status: 500 });
    }
  }

  static openBackupReadStream(
    filePath: string,
  ): ReturnType<typeof createReadStream> {
    return createReadStream(filePath);
  }
}
