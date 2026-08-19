/**
 * 状态页正文 → 一手更新序列。
 *
 * Statuspage（githubstatus / cloudflarestatus / status.openai.com …）的
 * `history.rss` 把一次 incident 的**全部更新**塞在一个 description 里：
 *
 *   Aug 18, 11:42 UTC  Resolved      - This incident has been resolved…
 *   Aug 18, 11:24 UTC  Update        - We have applied a mitigation…
 *   Aug 18, 10:58 UTC  Investigating - We are investigating reports of…
 *
 * 这是一条完整的、带时间戳的、**当事方自己写的**事件时间线。而
 * `truncateExcerpt` 在 600 字处截断，于是它被压平成一段摘录、后半截直接丢掉，
 * 详情页上那个事件只显示「时间线：1 格」。所以解析必须发生在 connector 里、
 * `truncateExcerpt` **之前**——过了那一步信息就没了。
 *
 * **不拆成多格时间线**：`AnalyzedTimelineEntry.signal_id` 不可为空，
 * `(event_id, signal_id)` 就是格子的身份。一次 incident 是**一条**信号，
 * 它的多次更新是这条信号的内部结构，所以落在 `EventSignal.incident_updates` 上。
 *
 * 解析刻意严格：匹配不上就整条弃权、退回原来的行为。宁可少解析，不要猜——
 * 与实体抽取「精度换召回是刻意的」同一条原则。
 */

/** Statuspage 的标准阶段词。不在这张表里的段落一律不当成一次更新。 */
const PHASES = [
  "Investigating",
  "Identified",
  "Update",
  "Monitoring",
  "Resolved",
  "Completed",
  "Scheduled",
  "In progress",
  "Verifying",
  "Postmortem",
] as const;

export type IncidentPhase = (typeof PHASES)[number];

export interface IncidentUpdate {
  /** ISO 串。契约里不出现 Date（见 shared/events.ts 的字段约定） */
  occurred_at: string;
  phase: IncidentPhase;
  text: string;
}

const PHASE_ALTERNATION = PHASES.map((p) => p.replace(/\s/gu, "\\s+")).join("|");

/*
 * 一段更新的形状：`<Mon> <D>, <HH:MM> UTC <Phase> - <text>`。
 *
 * 三处刻意的宽松：年份可有可无（Statuspage 当年的条目不写年）、逗号前后空格
 * 不固定（实测抓到的是 `Aug 18 , 11:42 UTC`）、分隔符可能是 `-` 或 `–`。
 * 除此之外一律从严——尤其**必须**有阶段词，否则任何一段带时间的正文都会被
 * 当成状态更新。
 */
const UPDATE_RE = new RegExp(
  String.raw`(?<month>Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+` +
    String.raw`(?<day>\d{1,2})\s*,\s*(?:(?<year>\d{4})\s*,\s*)?` +
    String.raw`(?<hour>\d{1,2}):(?<minute>\d{2})\s*UTC\s+` +
    String.raw`(?<phase>${PHASE_ALTERNATION})\s*[-–—]\s*(?<text>.*?)` +
    String.raw`(?=(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s*,|$)`,
  "gsu",
);

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

/** 一次 incident 最多留几格：再多是运维日志，不是给读者看的时间线。 */
const MAX_UPDATES = 12;
const TEXT_MAX_LENGTH = 300;

/**
 * 解析一条 Statuspage 条目的正文。
 *
 * @param publishedAt 条目自身的发布时间，只用来补年份——正文里的时间戳不写年，
 *   而跨年的 incident（12 月末 → 1 月初）按发布年硬填会差整整一年。
 */
export function parseIncidentUpdates(
  description: string,
  publishedAt: Date,
): IncidentUpdate[] {
  if (!description.trim()) {
    return [];
  }

  const updates: IncidentUpdate[] = [];
  for (const match of description.matchAll(UPDATE_RE)) {
    const g = match.groups;
    if (!g) continue;

    const occurredAt = resolveTimestamp(g, publishedAt);
    if (!occurredAt) continue;

    const text = normalizeText(g.text ?? "");
    if (!text) continue;

    updates.push({
      occurred_at: occurredAt.toISOString(),
      phase: normalizePhase(g.phase!),
      text,
    });
  }

  if (updates.length === 0) {
    return [];
  }

  /*
   * Statuspage 按**倒序**输出（最新的在最前）。统一成升序，与时间线其余部分
   * 一致；同刻的保持原相对次序（sort 是稳定的）。
   */
  updates.sort(
    (a, b) => Date.parse(a.occurred_at) - Date.parse(b.occurred_at),
  );
  return updates.slice(0, MAX_UPDATES);
}

function resolveTimestamp(
  g: Record<string, string | undefined>,
  publishedAt: Date,
): Date | null {
  const month = MONTHS[g.month ?? ""];
  const day = Number(g.day);
  const hour = Number(g.hour);
  const minute = Number(g.minute);
  if (month === undefined || !Number.isFinite(day) || hour > 23 || minute > 59) {
    return null;
  }

  /*
   * 年份：正文里有就用正文的。没有时按条目发布年填，再校一次——
   * 一次跨年的 incident（12/31 开始、1/1 结束）里，12 月那几格如果按发布年
   * （新的一年）填，会落到未来 11 个月。差得太远就退回上一年。
   */
  const year = g.year ? Number(g.year) : publishedAt.getUTCFullYear();
  let ts = Date.UTC(year, month, day, hour, minute);
  if (!g.year && ts - publishedAt.getTime() > 30 * 24 * 3600_000) {
    ts = Date.UTC(year - 1, month, day, hour, minute);
  }
  return new Date(ts);
}

function normalizePhase(raw: string): IncidentPhase {
  const collapsed = raw.replace(/\s+/gu, " ").trim().toLowerCase();
  return (
    PHASES.find((p) => p.toLowerCase() === collapsed) ?? "Update"
  );
}

function normalizeText(raw: string): string {
  const text = raw.replace(/\s+/gu, " ").trim();
  if (text.length <= TEXT_MAX_LENGTH) {
    return text;
  }
  return `${text.slice(0, TEXT_MAX_LENGTH - 1).trimEnd()}…`;
}

/**
 * 故障持续了多久（分钟）。首末两格之差。
 *
 * 只有一格时返回 null 而不是 0：**「说不出来」和「零分钟」必须能区分**，
 * 与 `has_velocity_baseline` 那条完全同理。
 */
export function incidentDurationMinutes(
  updates: readonly IncidentUpdate[],
): number | null {
  if (updates.length < 2) {
    return null;
  }
  const first = Date.parse(updates[0]!.occurred_at);
  const last = Date.parse(updates[updates.length - 1]!.occurred_at);
  if (!Number.isFinite(first) || !Number.isFinite(last) || last < first) {
    return null;
  }
  return Math.round((last - first) / 60_000);
}

/** 最后一格是不是收尾阶段。没有更新序列时返回 null（不是 false）。 */
export function incidentResolved(
  updates: readonly IncidentUpdate[],
): boolean | null {
  const last = updates[updates.length - 1];
  if (!last) {
    return null;
  }
  return last.phase === "Resolved" || last.phase === "Completed";
}
