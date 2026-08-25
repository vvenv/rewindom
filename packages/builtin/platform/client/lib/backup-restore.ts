import {
  DATABASE_DUMP_FILE_EXTENSION,
  type LocalRestoreCandidate,
} from "../../shared/index.js";

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
