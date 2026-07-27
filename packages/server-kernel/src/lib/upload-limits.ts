import { config } from "./config.js";

/** Excel 等导入场景的单文件上限 */
export const IMPORT_MAX_FILE_BYTES = 100 * 1024 * 1024;

/** 数据库备份还原允许的单文件上限（可通过 DATABASE_RESTORE_MAX_FILE_BYTES 配置） */
export const DATABASE_RESTORE_MAX_FILE_BYTES =
  config.database.restore.maxUploadFileBytes;

/** Fastify bodyLimit，须不小于所有上传场景的上限 */
export const MAX_UPLOAD_BYTES = DATABASE_RESTORE_MAX_FILE_BYTES;

export function formatMaxUploadSize(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) {
    return `${Math.round(gb)}GB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${Math.round(mb)}MB`;
}
