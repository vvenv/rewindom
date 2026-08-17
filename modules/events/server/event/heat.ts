/**
 * 热度与阶段——纯函数，不碰数据库。
 *
 * 产品口径（MVP §2、§7）：REWINDOM 展示的不是「它现在排第几」，而是
 * 「它正在发生变化」。所以对外的主指标是 velocity_pct（相对上一窗口的变化率），
 * heat_score 只用来在同等变化率下决定谁排前面。
 *
 * 「下降」是有主语的判断：热度曾经是 X，现在比 X 低。新事件的出生爆发滑出近窗、
 * 落入上一窗，数学上是 -100%，但并没有可比较的基线——那种情况增速记 0，不主张下降。
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
  let velocity = ((recent - previous) / base) * 100;
  if (velocity < 0 && !hasDeclineBaseline(signals, now, recent, previous)) {
    velocity = 0;
  }

  return {
    heat_score: round2(recent),
    velocity_pct: round2(clamp(velocity, -100, MAX_VELOCITY_PCT)),
  };
}

/**
 * 负增速只在这两种情况下成立：
 * 1. 两个窗口都有量——可观察的减速，哪怕事件还很新；
 * 2. 近窗已空、上一窗有量，且事件在上一窗打开之前就存在——上一窗是对已有事件的观察，
 *    不是出生爆发跟着时间窗滑过去。
 */
function hasDeclineBaseline(
  signals: readonly HeatSignal[],
  now: Date,
  recent: number,
  previous: number,
): boolean {
  if (previous <= 0) {
    return false;
  }
  if (recent > 0) {
    return true;
  }
  if (signals.length === 0) {
    return false;
  }
  const firstSeen = Math.min(
    ...signals.map((signal) => signal.published_at.getTime()),
  );
  return now.getTime() - firstSeen >= HEAT_WINDOW_HOURS * 2 * HOUR_MS;
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
