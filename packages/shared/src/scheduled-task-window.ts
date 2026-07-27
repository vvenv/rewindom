import { getZonedHour } from "./date.js";

/** 定时任务允许执行的最早小时（含，08:00 起） */
export const SCHEDULED_TASK_WINDOW_START_HOUR = 8;

/** 定时任务允许执行的最晚小时（含，13:59 仍属允许时段；14:00 起禁止） */
export const SCHEDULED_TASK_WINDOW_END_HOUR = 13;

export { getZonedHour };

/** 当前时刻是否在定时任务允许时段内（08:00–13:59，Asia/Shanghai） */
export function isWithinScheduledTaskWindow(now = new Date()): boolean {
  const hour = getZonedHour(now);
  return (
    hour >= SCHEDULED_TASK_WINDOW_START_HOUR &&
    hour <= SCHEDULED_TASK_WINDOW_END_HOUR
  );
}

/** 将配置的小时限制在平台允许的定时任务窗口内 */
export function clampScheduledWindowHour(hour: number): number {
  return Math.min(
    SCHEDULED_TASK_WINDOW_END_HOUR,
    Math.max(SCHEDULED_TASK_WINDOW_START_HOUR, Math.floor(hour)),
  );
}
