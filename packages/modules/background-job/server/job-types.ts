/**
 * 任务结果载荷。
 *
 * 具体形状由各业务模块自行定义，壳层只负责
 * 按 JSON 持久化到 `BackgroundJob.result`，读取侧自行 cast。
 * 故此处不约束字段——用 `object` 而非 `Record<string, unknown>`，
 * 否则业务侧的 `interface` 因缺少隐式索引签名而无法赋值。
 */
export type JobResult = object;

export const DATABASE_BACKUP_MAX_DURATION_MS = 90 * 60 * 1000;
export const DATABASE_RESTORE_MAX_DURATION_MS = 180 * 60 * 1000;
export const DATABASE_BACKUP_STALE_MESSAGE =
  "备份已超时（数据库较大时可能需要更长时间），请稍后重试";
export const DATABASE_BACKUP_RESTART_MESSAGE =
  "服务重启导致备份中断，请重新发起备份";
export const DATABASE_RESTORE_STALE_MESSAGE =
  "还原已超时（大库还原可能需要数小时），请稍后重试或检查 pg_restore 日志";
export const DATABASE_RESTORE_RESTART_MESSAGE =
  "服务重启导致还原中断，请重新上传备份文件";
export const DATABASE_RESTORE_INVALIDATED_JOBS_MESSAGE =
  "数据库已还原，该任务已失效";
export const FILE_JOB_RESTART_MESSAGE = "服务重启导致任务中断，请重新发起";
export const LIST_JOBS_DEFAULT_LIMIT = 30;
