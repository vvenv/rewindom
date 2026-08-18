/**
 * 热度与阶段——纯函数，不碰数据库。
 *
 * 产品口径（MVP §2、§7）：REWINDOM 展示的不是「它现在排第几」，而是
 * 「它正在发生变化」。
 *
 * **增速是有主语的判断**：热度曾经是 X，现在比 X 低（或高）。没有上一窗口就没有 X，
 * 那种情况一律记 0 并置 `has_velocity_baseline = false`，正负都不主张——
 * 曾经这里对正向缺基线的情况取 `base = 1` 造了个百分比出来，结果是
 *   velocity_pct = ((recent - 0) / 1) * 100 = heat_score * 100
 * 两个指标对「信号全落在同一个 6h 窗内」的事件恒等（线上实测 ≈ 全部事件），
 * 「正在升温」与「正在发生」两段因此排出同一串。
 *
 * 缺基线时能主张的是另一件事：近窗里**新来了几条信号、来自几个源**。
 * 那是可核对的事实，不是推断出来的比率，Rising 现在按它排序。
 */
import type { EventSourceKind, EventStatus } from "../../shared/index.js";

export const HEAT_WINDOW_HOURS = 6;
const HOUR_MS = 60 * 60 * 1000;
const DEVELOPING_MAX_AGE_HOURS = 6;
const ACTIVE_MAX_AGE_HOURS = 24;
const RESOLVED_MIN_AGE_HOURS = 24 * 7;
const DEVELOPING_MIN_VELOCITY = 50;
const COOLING_MAX_VELOCITY = -50;
/** velocity 上限：接近 0 的基数会让比率爆掉，界面上写 1000%+ 就够了。 */
const MAX_VELOCITY_PCT = 1000;

export interface HeatSignal {
  published_at: Date;
  score: number;
  comment_count: number;
  source_kind: EventSourceKind;
  source_name: string;
}

export interface HeatResult {
  heat_score: number;
  velocity_pct: number;
  /**
   * 上一窗口是否构成可比较的基线。false 时 `velocity_pct` 恒为 0，
   * 界面要区分「持平」（有基线、真没变）与「还说不出来」（没基线）。
   */
  has_velocity_baseline: boolean;
  /** 近窗内的信号条数——Rising 的次级排序键。 */
  recent_signal_count: number;
  /** 近窗内贡献过信号的不同来源数——Rising 的主排序键，跨源印证程度。 */
  recent_source_count: number;
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

function inWindow(
  signals: readonly HeatSignal[],
  now: Date,
  fromHoursAgo: number,
  toHoursAgo: number,
): HeatSignal[] {
  const start = now.getTime() - fromHoursAgo * HOUR_MS;
  const end = now.getTime() - toHoursAgo * HOUR_MS;
  return signals.filter((signal) => {
    const at = signal.published_at.getTime();
    return at > start && at <= end;
  });
}

function windowScore(signals: readonly HeatSignal[]): number {
  return signals.reduce((sum, signal) => sum + signalWeight(signal), 0);
}

export function computeHeat(
  signals: readonly HeatSignal[],
  now: Date,
): HeatResult {
  const recentSignals = inWindow(signals, now, HEAT_WINDOW_HOURS, 0);
  const recent = windowScore(recentSignals);
  const previous = windowScore(
    inWindow(signals, now, HEAT_WINDOW_HOURS * 2, HEAT_WINDOW_HOURS),
  );

  const baseline = hasVelocityBaseline(signals, now, recent, previous);
  // baseline 为真时 previous > 0，除法安全——不需要再造一个兜底基数
  const velocity = baseline ? ((recent - previous) / previous) * 100 : 0;

  return {
    heat_score: round2(recent),
    velocity_pct: round2(clamp(velocity, -100, MAX_VELOCITY_PCT)),
    has_velocity_baseline: baseline,
    recent_signal_count: recentSignals.length,
    recent_source_count: new Set(
      recentSignals.map((signal) => signal.source_name),
    ).size,
  };
}

/**
 * 上一窗口只在这两种情况下构成可比较的基线：
 * 1. 两个窗口都有量——可观察的加速或减速，哪怕事件还很新；
 * 2. 近窗已空、上一窗有量，且事件在上一窗打开之前就存在——上一窗是对已有事件的观察，
 *    不是出生爆发跟着时间窗滑过去。
 *
 * 上一窗口为空则一律没有基线。这条同时管住了正负两个方向：
 * 「从无到有」不是增长率，它是这个事件的第一次出现。
 */
function hasVelocityBaseline(
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
