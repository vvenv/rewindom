/**
 * 本地时钟上的「下一次 hh:mm」还有多久。
 *
 * 放 `lib/` 而不是 `infra/scheduler.service.ts`：`runtime/job-registry.ts` 要用它算
 * daily 节奏，而 scheduler.service 反过来依赖 registry。纯函数沉到底层，环就不存在。
 */
export function getMsUntilLocalTime(hour: number, minute: number): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
}
