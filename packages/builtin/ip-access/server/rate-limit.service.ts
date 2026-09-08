/**
 * 按 IP 限流。
 *
 * ## 为什么它比封禁更重要
 *
 * 封禁只对「少数几个固定 IP」有效。真实的滥用通常是**很多 IP 各来一点**——
 * 代理池、僵尸网络、被刷的公开接口。等你把 IP 枚举进名单，对方早换完了；
 * 住宅代理换 IP 的成本远低于你维护名单的成本。
 *
 * 限流不关心对方是谁，只关心「这个来源在这段时间里要得太多了」，
 * 天生对付 IP 轮换。它是这套访问控制里真正扛量的那一半。
 *
 * ## 分档而不是一个全局阈值
 *
 * 一个「每分钟 N 次」的全局阈值必然是错的：翻页浏览和暴力破解登录的合理速率
 * 差两个数量级。定成宽的挡不住爆破，定成严的挡住正常用户。所以按**代价**分档：
 *
 * - `auth`   —— 登录 / 注册 / 密码。爆破的目标，最严
 * - `public` —— 公开写接口（留言、订阅、表单）。垃圾内容的入口
 * - `default` —— 其余请求，宽到只挡明显异常
 *
 * ## 默认只观察
 *
 * 与规则一样，限流默认 `log_only`：阈值定错的代价是把真实用户挡在门外，
 * 而那比它要防的滥用严重得多。先看几天日志里谁会被挡，再切 `enforce`。
 */
import { getRedisClient } from "@rewindom/server-kernel/infra/redis.service.js";
import { config } from "@rewindom/server-kernel/lib/config.js";
import { createModuleLogger } from "@rewindom/server-kernel/lib/logger.js";

const log = createModuleLogger("ip-access");

export const RATE_LIMIT_TIERS = ["auth", "public", "default"] as const;
export type RateLimitTier = (typeof RATE_LIMIT_TIERS)[number];

export interface RateLimitDecision {
  tier: RateLimitTier;
  /** 窗口内已用次数（含本次） */
  count: number;
  limit: number;
  /** 超限了。`enforce` 模式下调用方据此拒绝 */
  exceeded: boolean;
  /** 建议的 Retry-After 秒数 */
  retryAfterSeconds: number;
}

/**
 * 认证类路径。这些是爆破的目标，也是唯一值得单独收紧的一档。
 *
 * 用前缀匹配而不是精确路由：`/api/auth/login` 之外还有注册、改密、OAuth 回调，
 * 逐个列会漏。
 */
const AUTH_PREFIXES = [
  "/api/auth/",
  "/api/member/oauth/",
  "/api/site-members/login",
  "/api/site-members/register",
];

/** 匿名可写的公开接口——垃圾内容的入口。 */
const PUBLIC_PREFIXES = ["/api/public/"];

export function resolveRateLimitTier(
  method: string,
  path: string,
): RateLimitTier {
  if (AUTH_PREFIXES.some((prefix) => path.startsWith(prefix))) return "auth";
  // 公开面的读请求不限严：那是官网正常浏览。只有写才是滥用入口。
  if (
    method !== "GET" &&
    method !== "HEAD" &&
    PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix))
  ) {
    return "public";
  }
  return "default";
}

function limitFor(tier: RateLimitTier): number {
  switch (tier) {
    case "auth":
      return config.ipAccess.rateLimitAuthPerMinute;
    case "public":
      return config.ipAccess.rateLimitPublicPerMinute;
    case "default":
      return config.ipAccess.rateLimitDefaultPerMinute;
  }
}

/**
 * 记一次请求并判断是否超限。
 *
 * 用固定窗口而不是滑动窗口：滑动窗口要为每个 IP 存一串时间戳，内存随请求量涨；
 * 固定窗口只需一个整数，代价是窗口交界处最坏能放过两倍的量。对「挡住明显滥用」
 * 这个目标来说，两倍的误差无关紧要。
 *
 * **Redis 不可用时放行**（fail-open）。限流是防滥用的，不是防故障的；
 * 因为 Redis 抖动把全站拒了，比它要防的滥用严重得多。
 */
export async function consumeRateLimit(params: {
  ip: string;
  method: string;
  path: string;
}): Promise<RateLimitDecision | null> {
  if (!config.ipAccess.rateLimitEnabled) return null;

  const tier = resolveRateLimitTier(params.method, params.path);
  const limit = limitFor(tier);
  // 0 表示这一档不限
  if (limit <= 0) return null;

  const windowSeconds = 60;
  const window = Math.floor(Date.now() / 1000 / windowSeconds);
  const key = `ip-access:rate:${tier}:${window}:${params.ip}`;

  try {
    const redis = getRedisClient();
    const results = await redis
      .pipeline()
      .incr(key)
      .expire(key, windowSeconds * 2)
      .exec();
    const count = Number(results?.[0]?.[1] ?? 0);
    if (!Number.isFinite(count) || count <= 0) return null;

    return {
      tier,
      count,
      limit,
      exceeded: count > limit,
      retryAfterSeconds:
        windowSeconds - Math.floor((Date.now() / 1000) % windowSeconds),
    };
  } catch (error) {
    log.warn({ error }, "限流计数失败，本次放行");
    return null;
  }
}
