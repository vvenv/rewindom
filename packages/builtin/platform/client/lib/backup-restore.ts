import {
  DATABASE_DUMP_FILE_EXTENSION,
  type LocalRestoreCandidate,
} from "../../shared/index.js";

const SIZE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

/** 人类可读的文件体积；备份动辄几百 MB，列表里给个量级就够。 */
export function formatBackupSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "—";
  }
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < SIZE_UNITS.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const digits = unitIndex === 0 || value >= 100 ? 0 : 1;
  return `${value.toFixed(digits)} ${SIZE_UNITS[unitIndex]}`;
}

/**
 * 上传前的扩展名预检。
 *
 * 服务端最终按文件头魔数判定，这里只是别让人白等一次几百 MB 的上传。
 */
export function isDatabaseDumpFilename(filename: string): boolean {
  return filename.trim().toLowerCase().endsWith(DATABASE_DUMP_FILE_EXTENSION);
}

/** 最近备份排在最前——要还原时找的几乎总是最新那份。 */
export function sortLocalRestoreCandidates(
  candidates: readonly LocalRestoreCandidate[],
): LocalRestoreCandidate[] {
  return [...candidates].sort((a, b) => b.modified_at - a.modified_at);
}
