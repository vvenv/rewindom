/** pending：等重投；processing：已认领；dead：重试耗尽，等人处理。 */
export const OUTBOX_STATUSES = ["pending", "processing", "dead"] as const;

export type OutboxStatus = (typeof OUTBOX_STATUSES)[number];

/**
 * 退避梯度，与 `mailer` 的 `BACKOFF_MS` 同一把尺子（1m / 5m / 15m / 1h / 6h）。
 *
 * 两处用同一梯度不是巧合：投递失败的成因也一样——对端抖动、配额、短暂不可达。
 * 各写一套的结果是同一场故障下两条队列的重试节奏错开，排障时对不上。
 */
export const OUTBOX_BACKOFF_MS = [
  60_000,
  5 * 60_000,
  15 * 60_000,
  60 * 60_000,
  6 * 60 * 60_000,
] as const;

/** 用完梯度就进死信。等于「最多重试 5 次，跨度约 7 小时」。 */
export const OUTBOX_MAX_ATTEMPTS = OUTBOX_BACKOFF_MS.length;

/**
 * 第 `attempts` 次失败后，下一次多久才轮到它。
 *
 * `attempts` 是**已经发生过的**尝试次数（1 = 刚失败第一次），因此索引要减一。
 * 超出梯度时返回最后一档，调用方应当先用 `hasAttemptsLeft` 判死信。
 */
export function nextAttemptDelayMs(attempts: number): number {
  const index = Math.min(
    Math.max(attempts, 1) - 1,
    OUTBOX_BACKOFF_MS.length - 1,
  );
  return OUTBOX_BACKOFF_MS[index];
}

export function hasAttemptsLeft(attempts: number): boolean {
  return attempts < OUTBOX_MAX_ATTEMPTS;
}

export function nextAttemptAt(attempts: number, now: Date): Date {
  return new Date(now.getTime() + nextAttemptDelayMs(attempts));
}

/**
 * 认领后多久算「卡住」，可以回收成 pending。
 *
 * 取值要大于任何一个 handler 的合理耗时，否则会在它还在跑的时候把同一条消息
 * 派给第二个执行者；又要小到让一次进程崩溃能在可接受的时间内自愈。
 */
export const OUTBOX_STUCK_MS = 5 * 60_000;

export function isStuck(lockedAt: Date | null, now: Date): boolean {
  if (!lockedAt) {
    return false;
  }
  return now.getTime() - lockedAt.getTime() >= OUTBOX_STUCK_MS;
}
