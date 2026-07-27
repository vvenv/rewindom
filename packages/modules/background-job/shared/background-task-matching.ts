/** 任务中心里 PostgreSQL 备份任务的标题前缀 */
export const DATABASE_BACKUP_TASK_TITLE_PREFIX = "数据备份";

/** 任务中心里 PostgreSQL 还原任务的标题前缀 */
export const DATABASE_RESTORE_TASK_TITLE_PREFIX = "数据还原";

/** 任务中心里系统基础数据备份标题前缀 */
export const SYSTEM_DATA_BACKUP_TASK_TITLE_PREFIX = "系统基础数据备份";

/** 任务中心里租户数据备份标题前缀 */
export const TENANT_DATA_BACKUP_TASK_TITLE_PREFIX = "租户数据备份";

export function isDatabaseBackupBackgroundTask(task: {
  title: string;
}): boolean {
  return task.title.startsWith(DATABASE_BACKUP_TASK_TITLE_PREFIX);
}

export function isDatabaseRestoreBackgroundTask(task: {
  title: string;
}): boolean {
  return task.title.startsWith(DATABASE_RESTORE_TASK_TITLE_PREFIX);
}

export function isSystemDataBackupTask(task: { title: string }): boolean {
  return task.title.startsWith(SYSTEM_DATA_BACKUP_TASK_TITLE_PREFIX);
}

export function isTenantDataBackupTask(task: { title: string }): boolean {
  return task.title.startsWith(TENANT_DATA_BACKUP_TASK_TITLE_PREFIX);
}

export function isPlatformBackupDownloadTask(task: { title: string }): boolean {
  return (
    isDatabaseBackupBackgroundTask(task) ||
    isSystemDataBackupTask(task) ||
    isTenantDataBackupTask(task)
  );
}

export function isDownloadableBackgroundTask(task: { title: string }): boolean {
  return isPlatformBackupDownloadTask(task);
}
