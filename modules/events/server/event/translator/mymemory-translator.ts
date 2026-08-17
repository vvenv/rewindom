import { config } from "@rewindom/module-sdk/server";

import { fetchText } from "../../ingest/http.js";

import type { EventTranslator } from "./translator.js";
import type { AppLocale } from "@rewindom/module-sdk";

/**
 * MyMemory 免费翻译（无需任何账号或 key）。
 *
 * 官方额度（已核对文档）：**匿名 5,000 字符/天**；在 `de=` 里给一个有效邮箱可以提到
 * **50,000 字符/天**。这个量级很紧——一条摘要 400 字符，12 条就吃光匿名额度——所以
 * 调用方只拿它翻**标题**，摘要留原文（见 event-refresh 的说明）。
 *
 * 单次请求的 `q` 上限 500 字节，超了直接跳过而不是截断：半句话的译文比原文更糟。
 */

const ENDPOINT = "https://api.mymemory.translated.net/get";
const MAX_QUERY_BYTES = 500;
const REQUEST_TIMEOUT_MS = 8_000;

const ANONYMOUS_DAILY_CHARS = 5_000;
const WITH_EMAIL_DAILY_CHARS = 50_000;

interface MyMemoryResponse {
  responseData?: { translatedText?: unknown; match?: unknown };
  responseStatus?: unknown;
  responseDetails?: unknown;
}

/**
 * 进程内的日额度账本。
 *
 * 故意不落库：额度是**按调用方 IP** 算的，多实例部署下谁也算不准别人用了多少；
 * 进程内计数只求「本进程不主动超额」，真超了服务端会拒，我们按失败处理即可。
 */
const budget = {
  day: "",
  used: 0,
};

function dailyQuota(): number {
  return config.events.translateEmail.trim()
    ? WITH_EMAIL_DAILY_CHARS
    : ANONYMOUS_DAILY_CHARS;
}

function takeBudget(chars: number): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (budget.day !== today) {
    budget.day = today;
    budget.used = 0;
  }
  if (budget.used + chars > dailyQuota()) {
    return false;
  }
  budget.used += chars;
  return true;
}

/** 供测试重置账本。 */
export function resetTranslationBudget(): void {
  budget.day = "";
  budget.used = 0;
}

export function remainingTranslationBudget(): number {
  const today = new Date().toISOString().slice(0, 10);
  return budget.day === today ? dailyQuota() - budget.used : dailyQuota();
}

export const myMemoryTranslator: EventTranslator = {
  id: "mymemory",
  translate: async (texts, from, to) => {
    const results: (string | null)[] = [];
    for (const text of texts) {
      results.push(await translateOne(text, from, to));
    }
    return results;
  },
};

async function translateOne(
  text: string,
  from: AppLocale,
  to: AppLocale,
): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed || from === to) {
    return null;
  }
  if (Buffer.byteLength(trimmed, "utf8") > MAX_QUERY_BYTES) {
    return null;
  }
  if (!takeBudget(trimmed.length)) {
    return null;
  }

  const params = new URLSearchParams({
    q: trimmed,
    langpair: `${from}|${to}`,
  });
  const email = config.events.translateEmail.trim();
  if (email) {
    params.set("de", email);
  }

  try {
    const body = await fetchText(`${ENDPOINT}?${params.toString()}`, {
      timeoutMs: REQUEST_TIMEOUT_MS,
      accept: "application/json",
    });
    return readTranslation(body, trimmed);
  } catch {
    // 限流、超时、网络抖动——这一条留原文，下一轮再试
    return null;
  }
}

/**
 * 取译文。刻意保守：状态码非 200、译文为空、或译文与原文一模一样时都当没翻出来，
 * 免得把 "MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS" 这种
 * 提示语当成标题写进库里。
 */
export function readTranslation(body: string, source: string): string | null {
  let parsed: MyMemoryResponse;
  try {
    parsed = JSON.parse(body) as MyMemoryResponse;
  } catch {
    return null;
  }

  if (Number(parsed.responseStatus) !== 200) {
    return null;
  }
  const translated = parsed.responseData?.translatedText;
  if (typeof translated !== "string") {
    return null;
  }
  const value = translated.trim();
  if (!value || value === source.trim()) {
    return null;
  }
  // 额度耗尽 / 无效请求时接口仍可能回 200，正文却是全大写的告警串
  if (/^MYMEMORY WARNING/iu.test(value) || /QUERY LENGTH LIMIT/iu.test(value)) {
    return null;
  }
  return value;
}
