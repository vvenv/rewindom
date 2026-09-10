import type {
  ScheduledJobSchedule,
  ScheduledJobState,
} from "../../shared/scheduled-job.js";

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

export interface ScheduleDescriptor {
  key: string;
  params: Record<string, string | number>;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * 节奏由服务端结构化下发，文案在这里拼。
 *
 * 按单位分成三个 key 而不是「{{count}} {{unit}}」：中英文的量词位置不一样，
 * 拼字符串的写法到英文那边就成了「every 30 分钟」。
 */
export function scheduleDescriptor(
  schedule: ScheduledJobSchedule,
): ScheduleDescriptor {
  if (schedule.kind === "daily") {
    return {
      key: "scheduledJobs.schedule.daily",
      params: { time: `${pad2(schedule.hour)}:${pad2(schedule.minute)}` },
    };
  }

  const ms = schedule.every_ms;
  if (ms >= MS_PER_HOUR && ms % MS_PER_HOUR === 0) {
    return {
      key: "scheduledJobs.schedule.everyHours",
      params: { count: ms / MS_PER_HOUR },
    };
  }
  if (ms >= MS_PER_MINUTE && ms % MS_PER_MINUTE === 0) {
    return {
      key: "scheduledJobs.schedule.everyMinutes",
      params: { count: ms / MS_PER_MINUTE },
    };
  }
  return {
    key: "scheduledJobs.schedule.everySeconds",
    params: { count: Math.max(1, Math.round(ms / MS_PER_SECOND)) },
  };
}

export function scheduleDescriptors(
  schedules: readonly ScheduledJobSchedule[],
): ScheduleDescriptor[] {
  return schedules.map(scheduleDescriptor);
}

export type ScheduledJobTone = "success" | "danger" | "warning" | "default";

/**
 * 黄色留给「正在重跑、但上一轮是失败的」：注册表在成功那一刻才把 streak 清零，
 * 所以 streak 还在就说明恢复尚未被证明。跑成功了就转绿——历史不会因此消失，
 * `failure_count` 仍留在行里。
 */
export function scheduledJobTone(job: ScheduledJobState): ScheduledJobTone {
  if (job.status === "error") return "danger";
  if (job.consecutive_failures > 0) return "warning";
  // 还没跑过第一轮，或正在跑第一轮：没有结论可报
  if (job.last_run_at === null || job.status === "running") return "default";
  return "success";
}

/** 出问题的排在最前：这个区块是在出事时看的，正常的任务往下沉。 */
export function sortScheduledJobs(
  jobs: readonly ScheduledJobState[],
): ScheduledJobState[] {
  const rank = (job: ScheduledJobState): number => {
    if (job.status === "error") return 0;
    if (job.consecutive_failures > 0 || job.failure_count > 0) return 1;
    return 2;
  };

  return [...jobs].sort((a, b) => {
    const byRank = rank(a) - rank(b);
    if (byRank !== 0) return byRank;
    const byStreak = b.consecutive_failures - a.consecutive_failures;
    if (byStreak !== 0) return byStreak;
    return a.id.localeCompare(b.id);
  });
}

export function formatJobDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < MS_PER_SECOND) return `${ms}ms`;
  return `${(ms / MS_PER_SECOND).toFixed(1)}s`;
}

/** 跳到这个任务在 ErrorLog 里的历史；route 与服务端 `jobErrorRoute` 同构。 */
export function jobErrorLogsPath(jobId: string): string {
  return `/platform/error-logs?q=${encodeURIComponent(`job:${jobId}`)}`;
}
