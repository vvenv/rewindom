/**
 * 术语保护：翻译前把「不该被翻译」的片段换成占位符，翻完再还原。
 *
 * 这一层是**上一次翻译被整片删掉的直接原因**——免费引擎会把 `Direct File`
 * 译成「直接文件」，而专有名词恰恰是事件标题里信息密度最高的部分。译错一个
 * 产品名，整条译文的可信度就归零了，读者还没法察觉。
 *
 * 保护的不是「英文」，是**标识性片段**：产品名、版本号、代码符号、URL。普通
 * 英文句子该翻还是要翻。
 *
 * 占位符用 `⟦n⟧`（U+27E6/27E7）：几乎不出现在正文里，主流 MT 会原样透传。
 * 还原时容忍引擎在方括号内外加空格；**没能透传的占位符不做补救**——把残留的
 * 占位符还原成原文，好过留一串乱码给读者。
 */

const PLACEHOLDER_OPEN = "⟦";
const PLACEHOLDER_CLOSE = "⟧";

/** 还原时的宽松匹配：引擎可能在括号内侧加空格。 */
const PLACEHOLDER_RE = /⟦\s*(\d+)\s*⟧/g;

/**
 * 内置的「一定不要翻」规则。顺序有意义：先长后短，避免 URL 里的
 * CamelCase 片段被先吃掉导致 URL 被拆散。
 */
const BUILTIN_PATTERNS: readonly RegExp[] = [
  // URL / 协议地址
  /\bhttps?:\/\/[^\s<>"']+/gi,
  // 邮箱
  /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g,
  // 版本号：v1.2.3 / 1.2.3 / v2 —— 展示原串可核对性最高（与 fact_version 同一条原则）
  /\bv?\d+\.\d+(?:\.\d+)*(?:-[\w.]+)?\b/g,
  /\bv\d+\b/gi,
  // 代码符号：带 _ / . / :: 的标识符，如 snake_case、foo.bar、std::vector
  /\b[A-Za-z][\w]*(?:(?:_|::|\.)[\w]+)+\b/g,
  // @handle
  /(?<![\w])@[\w.-]+/g,
  // CamelCase / PascalCase 单词：OpenAI、GitHub、DirectFile
  /\b[A-Z][a-z0-9]+(?:[A-Z][a-z0-9]*)+\b/g,
  // 全大写缩写（含 GPT-4 这类带数字后缀的）：API、LLM、GPT-4
  /\b[A-Z]{2,}(?:-\d+(?:\.\d+)?)?\b/g,
];

/**
 * 连续 2+ 个首字母大写的词 = 大概率专有名词（`Direct File`、`Prime Video`）。
 *
 * **刻意跳过句首**：英文句子第一个词天然大写，把它当专有名词会让整句话第一个词
 * 不翻，读起来比译错还怪。
 */
const TITLE_CASE_RUN_RE = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g;

export interface MaskedText {
  /** 送给翻译引擎的文本。 */
  masked: string;
  /** 下标即占位符编号。 */
  terms: string[];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 租户配置的术语：整词匹配，长的优先（`Apple TV` 要盖过 `Apple`）。 */
function keepTermPatterns(keepTerms: readonly string[]): RegExp[] {
  return [...keepTerms]
    .map((term) => term.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map((term) => {
      const body = escapeRegExp(term);
      // 术语两侧是单词字符才加边界——中文术语加 \b 会永远匹配不上
      const left = /^\w/.test(term) ? "\\b" : "";
      const right = /\w$/.test(term) ? "\\b" : "";
      return new RegExp(`${left}${body}${right}`, "g");
    });
}

/** 句首位置集合：字符串开头，或 `. ` / `! ` / `? ` / 换行之后。 */
function sentenceStarts(text: string): Set<number> {
  const starts = new Set<number>([0]);
  const re = /(?:[.!?]|\n)\s+/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    starts.add(match.index + match[0].length);
  }
  return starts;
}

export function maskTerms(
  text: string,
  keepTerms: readonly string[] = [],
): MaskedText {
  const terms: string[] = [];
  /** 已占用的区间，防止后一条规则切进前一条的中间。 */
  const taken: Array<[number, number]> = [];
  const replacements: Array<{ start: number; end: number; index: number }> = [];

  const overlaps = (start: number, end: number): boolean =>
    taken.some(([s, e]) => start < e && end > s);

  const claim = (start: number, end: number, value: string): void => {
    if (overlaps(start, end)) return;
    taken.push([start, end]);
    replacements.push({ start, end, index: terms.length });
    terms.push(value);
  };

  for (const pattern of [...keepTermPatterns(keepTerms), ...BUILTIN_PATTERNS]) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      claim(match.index, match.index + match[0].length, match[0]);
      // 零宽匹配防死循环
      if (match[0].length === 0) pattern.lastIndex += 1;
    }
  }

  const starts = sentenceStarts(text);
  TITLE_CASE_RUN_RE.lastIndex = 0;
  let run: RegExpExecArray | null;
  while ((run = TITLE_CASE_RUN_RE.exec(text)) !== null) {
    if (starts.has(run.index)) continue;
    claim(run.index, run.index + run[0].length, run[0]);
  }

  if (replacements.length === 0) return { masked: text, terms: [] };

  replacements.sort((a, b) => a.start - b.start);
  let masked = "";
  let cursor = 0;
  for (const item of replacements) {
    masked += text.slice(cursor, item.start);
    masked += `${PLACEHOLDER_OPEN}${item.index}${PLACEHOLDER_CLOSE}`;
    cursor = item.end;
  }
  masked += text.slice(cursor);
  return { masked, terms };
}

export function unmaskTerms(text: string, terms: readonly string[]): string {
  if (terms.length === 0) return text;
  return text.replace(PLACEHOLDER_RE, (whole, digits: string) => {
    const index = Number(digits);
    return terms[index] ?? whole;
  });
}

/** 引擎把占位符吃掉时的检测——调用方据此决定回退到原文。 */
export function survivedMasking(
  translated: string,
  terms: readonly string[],
): boolean {
  if (terms.length === 0) return true;
  const found = new Set<number>();
  for (const match of translated.matchAll(PLACEHOLDER_RE)) {
    found.add(Number(match[1]));
  }
  return found.size === terms.length;
}
