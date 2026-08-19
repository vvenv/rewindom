/**
 * 服务端翻译引擎：**只有需要 API key 的那几个**。
 *
 * 无 key 的引擎（浏览器内置 / LibreTranslate / MyMemory）由浏览器直连，
 * 服务端一行都不参与——那是这套方案「纯客户端、按需」的本体。这里存在的
 * 唯一理由是 key 不能进浏览器。
 *
 * 一律**只转发不落库**：译文不进任何表，口径与客户端引擎完全一致。
 */

import { getLlmClient } from "@rewindom/server-kernel/lib/openai-client.js";

import type { TranslationEngine } from "../shared/translation.js";

export interface ServerTranslateInput {
  texts: string[];
  target: string;
  source: string | null;
  apiKey: string;
  endpoint: string | null;
}

/** 上游超时：公开面在等这个响应，不能挂太久。 */
const UPSTREAM_TIMEOUT_MS = 20000;

async function postJson(
  url: string,
  init: { headers: Record<string, string>; body: unknown },
): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...init.headers },
    body: JSON.stringify(init.body),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`upstream ${response.status}`);
  }
  return response.json();
}

/** DeepL 只认大写主码，中文一律 `ZH`（它不分简繁的目标码）。 */
function toDeepLCode(locale: string): string {
  const main = locale.split("-")[0]?.toUpperCase() ?? locale.toUpperCase();
  if (main === "ZH") return "ZH";
  if (main === "EN") return "EN-US";
  return main;
}

async function translateDeepL(input: ServerTranslateInput): Promise<string[]> {
  // 免费版和 Pro 版是两个域名，key 以 `:fx` 结尾的是免费版
  const base = input.endpoint
    ? input.endpoint.replace(/\/+$/, "")
    : input.apiKey.endsWith(":fx")
      ? "https://api-free.deepl.com"
      : "https://api.deepl.com";
  const data = (await postJson(`${base}/v2/translate`, {
    headers: { authorization: `DeepL-Auth-Key ${input.apiKey}` },
    body: {
      text: input.texts,
      target_lang: toDeepLCode(input.target),
      ...(input.source ? { source_lang: toDeepLCode(input.source) } : {}),
    },
  })) as { translations?: Array<{ text?: string }> };
  return (data.translations ?? []).map((item) => item.text ?? "");
}

async function translateGoogle(input: ServerTranslateInput): Promise<string[]> {
  const base =
    input.endpoint?.replace(/\/+$/, "") ??
    "https://translation.googleapis.com/language/translate/v2";
  const data = (await postJson(
    `${base}?key=${encodeURIComponent(input.apiKey)}`,
    {
      headers: {},
      body: {
        q: input.texts,
        target: input.target,
        ...(input.source ? { source: input.source } : {}),
        format: "text",
      },
    },
  )) as { data?: { translations?: Array<{ translatedText?: string }> } };
  return (data.data?.translations ?? []).map((item) => item.translatedText ?? "");
}

/**
 * LLM：质量最好也最贵。
 *
 * 提示词里**再强调一次占位符**——术语遮罩已经在客户端做过，但 LLM 最爱
 * 「顺手帮你把 ⟦0⟧ 展开成它猜的意思」，那正是要防的。
 */
async function translateLlm(input: ServerTranslateInput): Promise<string[]> {
  const client = getLlmClient(
    { apiKey: input.apiKey, baseUrl: input.endpoint ?? "https://api.openai.com/v1" },
    { maxRetries: 1 },
  );
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "You are a translation engine. Translate each string in the input JSON array " +
          `into ${input.target}. Return ONLY a JSON array of the same length and order. ` +
          "Never translate, reorder, or expand placeholders of the form ⟦0⟧ — copy them verbatim. " +
          "Preserve product names, version numbers, and code identifiers exactly as given.",
      },
      { role: "user", content: JSON.stringify(input.texts) },
    ],
    response_format: { type: "json_object" },
  });
  const raw = completion.choices[0]?.message?.content ?? "";
  try {
    const parsed = JSON.parse(raw) as unknown;
    // 有的模型会包一层 { texts: [...] }，两种都收
    const list = Array.isArray(parsed)
      ? parsed
      : ((parsed as { texts?: unknown }).texts ?? []);
    return Array.isArray(list) ? list.map((item) => String(item ?? "")) : [];
  } catch {
    return [];
  }
}

/** 自定义端点：请求 / 响应形状与本模块的代理路由一致，便于自建中转。 */
async function translateCustom(input: ServerTranslateInput): Promise<string[]> {
  if (!input.endpoint) return [];
  const data = (await postJson(input.endpoint, {
    headers: { authorization: `Bearer ${input.apiKey}` },
    body: { texts: input.texts, target: input.target, source: input.source },
  })) as { texts?: unknown };
  return Array.isArray(data.texts) ? data.texts.map((i) => String(i ?? "")) : [];
}

const SERVER_ENGINES: Partial<
  Record<TranslationEngine, (input: ServerTranslateInput) => Promise<string[]>>
> = {
  deepl: translateDeepL,
  google: translateGoogle,
  llm: translateLlm,
  custom: translateCustom,
};

/**
 * 返回值**保证与 `texts` 等长同序**：上游少回、多回、抛错，一律补原文。
 * 错位的译文比不译更糟——读者会以为 A 事件的摘要是 B 事件的。
 */
export async function translateOnServer(
  engine: TranslationEngine,
  input: ServerTranslateInput,
): Promise<string[]> {
  const impl = SERVER_ENGINES[engine];
  if (!impl) return [...input.texts];
  let result: string[];
  try {
    result = await impl(input);
  } catch {
    return [...input.texts];
  }
  if (result.length !== input.texts.length) return [...input.texts];
  return result.map((item, index) => item || (input.texts[index] as string));
}
