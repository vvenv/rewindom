/**
 * 代理路由的进程内限流。
 *
 * **必须有**：`/api/public/translation/translate` 无鉴权，花的却是租户自己的
 * DeepL / LLM 额度。没有这一层，一个脚本几分钟就能把额度刷空，账单落在站长头上。
 *
 * 进程内、按 IP + 租户的令牌桶。单进程部署下够用；真要抗分布式滥用得上网关层，
 * 那是部署决策不是模块职责。
 */

/** 每个窗口允许的**段数**（不是请求数）——一次请求可以带 64 段。 */
const SEGMENTS_PER_WINDOW = 600;
const WINDOW_MS = 60_000;
/** 桶上限，防止长时间不访问的 key 无限堆积。 */
const MAX_BUCKETS = 5000;

interface Bucket {
  segments: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function sweep(now: number): void {
  if (buckets.size <= MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retry_after_seconds: number;
}

export function consumeTranslationQuota(
  key: string,
  segments: number,
  now = Date.now(),
): RateLimitResult {
  sweep(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { segments, resetAt: now + WINDOW_MS });
    return { allowed: true, retry_after_seconds: 0 };
  }
  if (bucket.segments + segments > SEGMENTS_PER_WINDOW) {
    return {
      allowed: false,
      retry_after_seconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  bucket.segments += segments;
  return { allowed: true, retry_after_seconds: 0 };
}

/** 测试用。 */
export function resetTranslationQuota(): void {
  buckets.clear();
}
