/**
 * 信号文本 → 向量。
 *
 * 只为一件事存在：让「同一件事的不同措辞」能被认出来。词面判据有明确天花板
 *（MODULE.md「聚类能力边界」：该合并与不该合并的两对同分 0.33），跨过去只能靠语义。
 *
 * 走 OPENAI_EMBEDDING_* 一组独立配置——与对话模型分开是必须的：
 * `OPENAI_BASE_URL` 指向 deepseek，而 deepseek 不提供 embeddings 端点。
 *
 * **没配 key 时返回空数组，不抛错**。聚类会退回纯词面判据，与没有这一层时完全一致。
 */
import { config } from "@rewindom/module-sdk/server";

/** 单次请求最多几条。供应商普遍限制批量大小，也避免一次请求体过大。 */
const BATCH_SIZE = 32;
/**
 * 每批的重试次数。实测供应商会间歇性超时或断连（同一条文本重发即成功），
 * 不重试的话每轮采集都会有一小撮信号平白失去语义判据。
 */
const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 500;
/** 送去 embed 的文本上限。标题是主要信息，摘录只用来消歧，给一小段就够。 */
const MAX_INPUT_LENGTH = 512;
const REQUEST_TIMEOUT_MS = 20_000;

export interface EmbeddableSignal {
  title: string;
  excerpt: string;
}

/**
 * 拼出送去 embed 的文本。
 *
 * 标题在前且摘录截得很短：两条报道同一件事时标题往往措辞不同，
 * 摘录能提供消歧线索，但整段正文会把「这是什么事」淹没在细节里。
 */
export function buildEmbeddingInput(signal: EmbeddableSignal): string {
  const title = signal.title.trim();
  const excerpt = signal.excerpt.trim();
  const text = excerpt.length > 0 ? `${title}\n${excerpt}` : title;
  return text.slice(0, MAX_INPUT_LENGTH);
}

export function isEmbeddingEnabled(): boolean {
  const { apiKey, baseUrl, model } = config.embeddings;
  return (
    apiKey.trim().length > 0 &&
    baseUrl.trim().length > 0 &&
    model.trim().length > 0
  );
}

/**
 * 批量取向量。返回数组与入参一一对应；任何一批失败时该批回落成空数组，
 * 其余批次照常返回——一次限流不该让整轮采集失去语义判据。
 */
export async function embedTexts(texts: readonly string[]): Promise<number[][]> {
  if (texts.length === 0 || !isEmbeddingEnabled()) {
    return texts.map(() => []);
  }

  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    out.push(...(await embedBatchWithRetry(texts.slice(i, i + BATCH_SIZE))));
  }
  return out;
}

async function embedBatchWithRetry(batch: readonly string[]): Promise<number[][]> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      return await requestEmbeddings(batch);
    } catch {
      if (attempt < MAX_ATTEMPTS - 1) {
        await sleep(RETRY_BASE_DELAY_MS * (attempt + 1));
      }
    }
  }
  // 仍然失败：这一批退回「没有向量」，其余批次照常。
  // 一次限流不该让整轮采集失去语义判据，更不该让采集本身失败。
  return batch.map(() => []);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestEmbeddings(batch: readonly string[]): Promise<number[][]> {
  const { baseUrl, apiKey, model, dimensions } = config.embeddings;
  const response = await fetch(`${baseUrl.replace(/\/+$/u, "")}/embeddings`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: batch,
      // 0 = 不指定，用模型默认维度。供应商不支持这个参数时也会忽略它
      ...(dimensions > 0 ? { dimensions } : {}),
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`embeddings ${response.status}`);
  }

  const payload = (await response.json()) as {
    data?: { index?: number; embedding?: unknown }[];
  };

  const rows = Array.isArray(payload.data) ? payload.data : [];

  // 按 index 回填而不是按返回顺序：接口不保证顺序与入参一致
  const result: number[][] = batch.map(() => []);
  rows.forEach((row, position) => {
    const index = typeof row.index === "number" ? row.index : position;
    if (index >= 0 && index < result.length && Array.isArray(row.embedding)) {
      result[index] = row.embedding as number[];
    }
  });

  // 少给了行就当整批失败——半批向量会让一部分信号莫名失去语义判据，
  // 而调用方无从分辨「这条不像」和「这条没算」
  if (result.some((row) => row.length === 0)) {
    throw new Error("embeddings 返回行数不全");
  }
  return result;
}

/**
 * 余弦相似度。任一侧为空（没有向量）时返回 0——「不知道」必须表现为
 * 「不相似」，否则没配 key 的环境会把所有事件合成一个。
 */
export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length === 0 || a.length !== b.length) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dot / Math.sqrt(normA * normB);
}

/**
 * 把新向量并进事件质心（按成员数加权的增量均值）。
 *
 * 用均值而不是「立事件那条信号的向量」：后者会让事件永远停留在第一次措辞上，
 * 后续来的跟进报道越贴近事件全貌、反而越难并进来。
 */
export function mergeCentroid(
  centroid: readonly number[],
  memberCount: number,
  incoming: readonly number[],
): number[] {
  if (incoming.length === 0) {
    return [...centroid];
  }
  if (centroid.length !== incoming.length || memberCount <= 0) {
    return [...incoming];
  }
  return centroid.map(
    (value, i) => (value * memberCount + incoming[i]) / (memberCount + 1),
  );
}
