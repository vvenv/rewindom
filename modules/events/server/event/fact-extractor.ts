/**
 * 按类型抽关键事实——纯函数，不碰数据库、不调模型。
 *
 * 抽的是**原文里的那几个字符**，不是推断出来的结论：`$7B` 就是标题里写着的
 * `$7B`，`v1.31.0` 就是标题里写着的 `v1.31.0`。所以展示的永远是原串
 *（`amount_text` / `version`），归一化值（`amount_usd`）只为聚合服务。
 *
 * 抽不到就留 null。**绝不从上下文推断金额或时长**——与「时间戳不由模型给」
 * 完全同一条：一旦允许推断，就会出现「据此估算约 20 亿美元」这种看似合理、
 * 实则没有出处的数字。
 */
import {
  EMPTY_EVENT_FACTS,
  type EventFacts,
  type EventKind,
} from "../../shared/index.js";

export interface ExtractableSignal {
  title: string;
  excerpt: string;
}

/**
 * 版本号：至少两段数字，且**前面不能是货币符号**。
 *
 * 只有一段（`v2`）不收——`Windows 11`、`GPT 5`、`Series C` 里到处都是孤立数字，
 * 收进来就是一堆假版本号。
 *
 * 货币那道闸是真实语料打回来的：「Fairphone's latest repairable phone is going
 * on sale in the US」的正文里有 `$649.99`，被当成版本号抽了出来。
 */
const VERSION_RE =
  /(?<![$€£]\s?)\bv?(\d+\.\d+(?:\.\d+)*(?:[-+][0-9a-z.]+)?)\b/iu;

/**
 * 金额：币种符号 + 数字 + 可选量级词。
 *
 * 只认符号在前的写法（`$7B`、`$2.1 million`）。`7 billion dollars` 这类不收——
 * 它需要判断「7」到底是不是金额，而周围的数字太多。
 */
const AMOUNT_RE =
  /([$€£])\s?(\d[\d,]*(?:\.\d+)?)\s*(billion|million|thousand|bn|[bmk])?\b/iu;

const MAGNITUDE: Record<string, number> = {
  k: 1e3, thousand: 1e3,
  m: 1e6, million: 1e6,
  b: 1e9, bn: 1e9, billion: 1e9,
};

/** 哪些类型该抽金额。发版与故障抽出来的多半是价格或赔付，不是这件事的主角。 */
const AMOUNT_KINDS: readonly EventKind[] = ["acquisition", "funding", "legal"];

export function extractEventFacts(
  kind: EventKind | null,
  signals: readonly ExtractableSignal[],
): EventFacts {
  if (!kind || signals.length === 0) {
    return { ...EMPTY_EVENT_FACTS };
  }

  const facts: EventFacts = { ...EMPTY_EVENT_FACTS };

  if (kind === "release") {
    facts.version = firstMatch(signals, VERSION_RE, (m) => m[1] ?? null);
  }

  if (AMOUNT_KINDS.includes(kind)) {
    const amount = firstMatch(signals, AMOUNT_RE, (m) => m);
    if (amount) {
      facts.amount_text = normalizeAmountText(amount[0]!);
      facts.amount_usd = toUsd(amount);
    }
  }

  // 故障的时长与结局来自一手更新序列（incident-updates），不在这里猜
  return facts;
}

/**
 * 标题优先于摘录：标题是这条材料在说什么，摘录里出现的数字常常是背景
 *（「去年该公司营收 $12B」不是这次收购的价钱）。
 */
function firstMatch<T>(
  signals: readonly ExtractableSignal[],
  re: RegExp,
  pick: (m: RegExpMatchArray) => T | null,
): T | null {
  for (const signal of signals) {
    const hit = signal.title.match(re);
    if (hit) return pick(hit);
  }
  for (const signal of signals) {
    const hit = signal.excerpt.match(re);
    if (hit) return pick(hit);
  }
  return null;
}

function normalizeAmountText(raw: string): string {
  return raw.replace(/\s+/gu, " ").trim();
}

/**
 * 归一化到美元。
 *
 * **只有 `$` 才填 `amount_usd`**：把 `€2M` 按汇率折成美元是**引入来源外的事实**
 *（汇率哪来的？哪一天的？），与「不引入来源外的事实」这条边界直接冲突。
 * 非美元的保留原串展示、`amount_usd` 留空——聚合时它不参与，展示时它照样准确。
 */
function toUsd(match: RegExpMatchArray): number | null {
  const [, currency, digits, unit] = match;
  if (currency !== "$" || !digits) {
    return null;
  }
  const base = Number(digits.replace(/,/gu, ""));
  if (!Number.isFinite(base)) {
    return null;
  }
  const factor = unit ? (MAGNITUDE[unit.toLowerCase()] ?? 1) : 1;
  return base * factor;
}
