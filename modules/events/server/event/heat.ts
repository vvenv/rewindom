/**
 * 热度与阶段——纯函数，不碰数据库。
 *
 * 产品口径（MVP §2、§7）：REWINDOM 展示的不是「它现在排第几」，而是
 * 「它正在发生变化」。所以对外的主指标是 velocity_pct（相对上一窗口的变化率），
 * heat_score 只用来在同等变化率下决定谁排前面。
 */
import type { EventSourceKind, EventStatus } from "../../shared/index.js";

export const HEAT_WINDOW_HOURS = 6;
const HOUR_MS = 60 * 60 * 1000;
const DEVELOPING_MAX_AGE_HOURS = 6;
const ACTIVE_MAX_AGE_HOURS = 24;
const RESOLVED_MIN_AGE_HOURS = 24 * 7;
const DEVELOPING_MIN_VELOCITY = 50;
const COOLING_MAX_VELOCITY = -50;
/** velocity 上限：0 → 1 的增长在数学上是无穷大，界面上写 1000%+ 就够了。 */
const MAX_VELOCITY_PCT = 1000;

export interface HeatSignal {
  published_at: Date;
  score: number;
  comment_count: number;
  source_kind: EventSourceKind;
}

export interface HeatResult {
  heat_score: number;
  velocity_pct: number;
}

/**
 * 来源权重：一手公告比转述更能说明「事情真的发生了」，
 * 社区讨论量大但单条价值低。
 */
const SOURCE_WEIGHT: Record<EventSourceKind, number> = {
  official: 2,
  news: 1.5,
  community: 1,
};

function signalWeight(signal: HeatSignal): number {
  const engagement =
    Math.log10(1 + Math.max(0, signal.score)) +
    0.5 * Math.log10(1 + Math.max(0, signal.comment_count));
  return SOURCE_WEIGHT[signal.source_kind] * (1 + engagement);
}

function windowScore(
  signals: readonly HeatSignal[],
  now: Date,
  fromHoursAgo: number,
  toHoursAgo: number,
): number {
  const start = now.getTime() - fromHoursAgo * HOUR_MS;
  const end = now.getTime() - toHoursAgo * HOUR_MS;
  return signals
    .filter((signal) => {
      const at = signal.published_at.getTime();
      return at > start && at <= end;
    })
    .reduce((sum, signal) => sum + signalWeight(signal), 0);
}

export function computeHeat(
  signals: readonly HeatSignal[],
  now: Date,
): HeatResult {
  const recent = windowScore(signals, now, HEAT_WINDOW_HOURS, 0);
  const previous = windowScore(
    signals,
    now,
    HEAT_WINDOW_HOURS * 2,
    HEAT_WINDOW_HOURS,
  );

  // 上一窗口为 0 时不能除——用 1 作基数，等价于「从无到有」按绝对量给增速
  const base = previous > 0 ? previous : 1;
  const velocity = ((recent - previous) / base) * 100;

  return {
    heat_score: round2(recent),
    velocity_pct: round2(clamp(velocity, -100, MAX_VELOCITY_PCT)),
  };
}

export function resolveStatus(params: {
  last_activity_at: Date;
  velocity_pct: number;
  now: Date;
}): EventStatus {
  const ageHours =
    (params.now.getTime() - params.last_activity_at.getTime()) / HOUR_MS;

  if (ageHours > RESOLVED_MIN_AGE_HOURS) {
    return "resolved";
  }
  if (
    ageHours <= DEVELOPING_MAX_AGE_HOURS &&
    params.velocity_pct >= DEVELOPING_MIN_VELOCITY
  ) {
    return "developing";
  }
  if (
    ageHours <= ACTIVE_MAX_AGE_HOURS &&
    params.velocity_pct > COOLING_MAX_VELOCITY
  ) {
    return "active";
  }
  return "cooling";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
