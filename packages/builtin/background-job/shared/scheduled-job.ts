/**
 * 平台定时任务的运行态 DTO。
 *
 * 与内核 `JobRunState` 同形，但另写一份：client 不该 import server-kernel。
 * 节奏以结构化形式下发（而不是服务端拼好的 "每 30 分钟"），文案在前端按语言渲染。
 */
export type ScheduledJobSchedule =
  | {
      kind: "interval";
      every_ms: number;
      initial_delay_ms?: number;
      run_on_start?: boolean;
    }
  | { kind: "daily"; hour: number; minute: number };

export type ScheduledJobStatus = "idle" | "running" | "ok" | "error";

export interface ScheduledJobState {
  id: string;
  module_id: string;
  label: string;
  schedules: ScheduledJobSchedule[];
  status: ScheduledJobStatus;
  last_run_at: string | null;
  last_success_at: string | null;
  last_duration_ms: number | null;
  last_error: string | null;
  run_count: number;
  failure_count: number;
  consecutive_failures: number;
  skipped_count: number;
}

export interface ScheduledJobOverview {
  /** 进程启动时刻：运行态存在内存里，重启即清零，界面必须说清楚统计的起点。 */
  since: string;
  total: number;
  failing: number;
  items: ScheduledJobState[];
}
