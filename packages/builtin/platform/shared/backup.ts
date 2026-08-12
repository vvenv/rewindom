/**
 * 整库备份与还原的跨端契约。
 *
 * 备份是 PostgreSQL 自定义格式 dump（`pg_dump -Fc`），还原走 `pg_restore`，
 * 两端都只认这一种格式——服务端会校验文件头魔数，选错文件在上传后才会被拒。
 */

/** 服务端在 `DATABASE_RESTORE_LOCAL_PATHS` 白名单目录下发现的可还原文件。 */
export interface LocalRestoreCandidate {
  /** 绝对路径；还原时原样回传，服务端再校验是否落在白名单内 */
  file_path: string;
  filename: string;
  size_bytes: number;
  /** epoch 毫秒 */
  modified_at: number;
}

export interface LocalRestoreCandidatesResponse {
  candidates: LocalRestoreCandidate[];
}

/** 备份 / 还原都是后台任务，接口只回任务 id，进度在任务中心看。 */
export interface BackgroundJobStartedResponse {
  job_id: string;
}

export interface StartLocalRestoreBody {
  file_path: string;
}

/** `pg_dump -Fc` 产物的扩展名；上传选文件时用它做 accept 与前置校验。 */
export const DATABASE_DUMP_FILE_EXTENSION = ".dump";
