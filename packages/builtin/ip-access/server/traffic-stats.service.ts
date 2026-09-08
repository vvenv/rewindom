/**
 * 访问来源统计 —— 回答「现在谁在打我」。
 *
 * ## 为什么需要它
 *
 * 封禁能力回答的是「怎么拦」，但真正难的一步在前面：**你怎么知道该拦谁**。
 * 没有这一层，运维只能去 SSH 上 `awk` nginx 日志，把 IP 手抄进后台——
 * 而攻击正在进行时，这几分钟很贵。
 *
 * ## 为什么不落库
 *
 * 每个请求写一行意味着高峰期每秒几千次写入，为了一个「看一眼谁在打我」的视图
 * 不值得。这里用 Redis 滚动计数：
 *
 * - 按时间分桶（默认 5 分钟一个），桶自带 TTL，过期自动消失，无需清理任务
 * - 每桶是一个 sorted set，`ZINCRBY` 累加，查询时 `ZUNIONSTORE` 合并最近若干桶
 * - 定期裁剪到 Top N —— 否则一次大范围扫描能往 Redis 里塞进上百万个成员
 *
 * ## 为什么它是易失的
 *
 * Redis 挂了 / 重启就归零。这是**刻意的取舍**：这份数据的用途是「此刻发生了什么」，
 * 不是审计。为它做持久化会把一个观测面变成又一张要维护、要清理、要备份的表。
 * 需要长期留存时，nginx access log 才是那份真相。
 */
import { getRedisClient } from "@rewindom/server-kernel/infra/redis.service.js";
import { config } from "@rewindom/server-kernel/lib/config.js";
import { createModuleLogger } from "@rewindom/server-kernel/lib/logger.js";

import type { RequestTimingSample } from "@rewindom/server-kernel/middleware/request-timing.middleware.js";

const log = createModuleLogger("ip-access");

const KEY_PREFIX = "ip-access:traffic";

export interface TrafficSource {
  ip: string;
  /** 窗口内总请求数 */
  requests: number;
  /** 其中 4xx / 5xx 的数量 */
  errors: number;
  /** errors / requests，0–1 */
  error_rate: number;
}

function bucketId(at: number, bucketSeconds: number): number {
  return Math.floor(at / 1000 / bucketSeconds);
}

function totalKey(bucket: number): string {
  return `${KEY_PREFIX}:total:${bucket}`;
}

function errorKey(bucket: number): string {
  return `${KEY_PREFIX}:error:${bucket}`;
}

/**
 * 记一次请求。
 *
 * 由内核的 request-timing 订阅者调用，跑在 `onResponse` 上——响应已经发出去了，
 * 这里再慢也不影响用户。即便如此仍然不 await：Redis 抖动不该拖住事件循环。
 */
export function recordTrafficSample(sample: RequestTimingSample): void {
  if (!config.ipAccess.trafficStats) return;
  const ip = sample.ip_address;
  // 拿不到可信 IP 就不记。记成 "unknown" 会让那一行永远排在榜首，
  // 却指不出任何可以处置的对象。
  if (!ip) return;

  const bucket = bucketId(Date.now(), config.ipAccess.trafficBucketSeconds);
  // 桶 TTL 给足窗口长度的两倍，避免边界上刚好被剔掉
  const ttl = config.ipAccess.trafficBucketSeconds * config.ipAccess.trafficBuckets * 2;

  void (async () => {
    try {
      const redis = getRedisClient();
      const pipeline = redis.pipeline();
      pipeline.zincrby(totalKey(bucket), 1, ip);
      pipeline.expire(totalKey(bucket), ttl);
      if (sample.status_code >= 400) {
        pipeline.zincrby(errorKey(bucket), 1, ip);
        pipeline.expire(errorKey(bucket), ttl);
      }
      await pipeline.exec();
    } catch {
      // 观测数据丢几条无所谓，绝不能因此影响服务
    }
  })();
}

/** 最近 N 个桶的 key（含当前这个不完整的桶）。 */
function recentKeys(kind: "total" | "error"): string[] {
  const current = bucketId(Date.now(), config.ipAccess.trafficBucketSeconds);
  const keys: string[] = [];
  for (let i = 0; i < config.ipAccess.trafficBuckets; i += 1) {
    keys.push(kind === "total" ? totalKey(current - i) : errorKey(current - i));
  }
  return keys;
}

/**
 * 取窗口内请求量最高的来源。
 *
 * 合并结果写进临时 key 再读，而不是把每个桶拉回进程里自己加——
 * 桶里可能有几十万个成员，全拉回来既慢又占内存。
 */
export async function getTopTrafficSources(
  limit: number,
): Promise<TrafficSource[]> {
  if (!config.ipAccess.trafficStats) return [];

  try {
    const redis = getRedisClient();
    const mergedTotal = `${KEY_PREFIX}:merged:total:${Date.now()}`;
    const mergedError = `${KEY_PREFIX}:merged:error:${Date.now()}`;

    const totalKeys = recentKeys("total");
    const errorKeys = recentKeys("error");

    const pipeline = redis.pipeline();
    pipeline.zunionstore(mergedTotal, totalKeys.length, ...totalKeys);
    pipeline.expire(mergedTotal, 60);
    pipeline.zunionstore(mergedError, errorKeys.length, ...errorKeys);
    pipeline.expire(mergedError, 60);
    pipeline.zrevrange(mergedTotal, 0, limit - 1, "WITHSCORES");
    const results = await pipeline.exec();

    const raw = (results?.[4]?.[1] ?? []) as string[];
    const ips: { ip: string; requests: number }[] = [];
    for (let i = 0; i < raw.length; i += 2) {
      const ip = raw[i];
      const score = Number(raw[i + 1]);
      if (ip && Number.isFinite(score)) ips.push({ ip, requests: score });
    }
    if (ips.length === 0) {
      await redis.del(mergedTotal, mergedError);
      return [];
    }

    const errorScores = await redis.zmscore(
      mergedError,
      ...ips.map((entry) => entry.ip),
    );
    await redis.del(mergedTotal, mergedError);

    return ips.map((entry, index) => {
      const errors = Number(errorScores?.[index] ?? 0) || 0;
      return {
        ip: entry.ip,
        requests: entry.requests,
        errors,
        error_rate: entry.requests > 0 ? errors / entry.requests : 0,
      };
    });
  } catch (error) {
    log.warn({ error }, "读取访问来源统计失败");
    return [];
  }
}

/**
 * 裁剪掉尾部，只保留每桶请求量最高的若干成员。
 *
 * 不裁的话，一次 /16 范围的扫描就能往每个桶里塞进上万个只出现过一次的 IP，
 * Redis 内存被观测数据吃掉——那比不做观测更糟。
 */
export async function trimTrafficBuckets(): Promise<void> {
  if (!config.ipAccess.trafficStats) return;
  const keep = config.ipAccess.trafficMaxTracked;
  try {
    const redis = getRedisClient();
    const pipeline = redis.pipeline();
    for (const key of [...recentKeys("total"), ...recentKeys("error")]) {
      // 保留分数最高的 keep 个：按 rank 删掉 [0, -keep-1]
      pipeline.zremrangebyrank(key, 0, -keep - 1);
    }
    await pipeline.exec();
  } catch (error) {
    log.warn({ error }, "裁剪访问来源统计失败");
  }
}

export function getTrafficWindowMinutes(): number {
  return Math.round(
    (config.ipAccess.trafficBucketSeconds * config.ipAccess.trafficBuckets) / 60,
  );
}
