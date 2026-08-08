export type BackgroundJobStatus =
  | "running"
  | "success"
  | "warning"
  | "error"
  | "cancelled";

export type BackgroundJobType =
  | "database_backup"
  | "database_restore"
  | "data_backup"
  | "data_restore";

export interface DatabaseBackupJobResult {
  file_path: string;
  file_size_bytes: number;
  duration_ms: number;
  filename?: string;
  size_bytes?: number;
}

export interface BackgroundJobListItem {
  id: string;
  type: BackgroundJobType;
  title: string;
  status: BackgroundJobStatus;
  description: string | null;
  result: unknown;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
}

export interface BackgroundJobDto {
  job_id: string;
  type: BackgroundJobType;
  title: string;
  status: BackgroundJobStatus;
  description: string | null;
  result: unknown;
  created_at: number;
  finished_at: number | null;
}
