/**
 * 名单快照 —— 判定跑在每个请求的最前面，不能每次都查库。
 *
 * 三条硬约束：
 *
 * 1. **fail-open**。加载失败时沿用上一份快照；从没加载成功过就当空名单放行。
 *    一次数据库抖动不该让全站 403——那比它要防的攻击严重得多。
 * 2. **跨实例要收敛**。写操作发 Redis 广播让其它实例立刻重载；Redis 不可用时
 *    退化成 TTL 轮询，最迟 `refreshIntervalMs` 后一致。
 * 3. **过期规则不参与匹配**。快照按 `expires_at > now` 过滤，不依赖清理 job——
 *    job 只负责删行，判定的正确性不能挂在它身上。
 */
import { getRedisClient } from "@rewindom/server-kernel/infra/redis.service.js";
import { config } from "@rewindom/server-kernel/lib/config.js";
import { createModuleLogger } from "@rewindom/server-kernel/lib/logger.js";
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";

import {
  CidrMatcher,
  parseAddress,
  parseCidr,
  type IpRuleAction,
  type IpRuleMode,
} from "../shared/index.js";

import type { MatchedRule, RuleScope } from "./ip-access.decision.js";

const log = createModuleLogger("ip-access");

export const IP_ACCESS_INVALIDATE_CHANNEL = "ip-access:invalidate";

interface Snapshot {
  /** tenant_id === null 的规则 */
  platform: CidrMatcher<MatchedRule>;
  /** tenant_id → matcher */
  byTenant: Map<string, CidrMatcher<MatchedRule>>;
  loadedAt: number;
  ruleCount: number;
}

function emptySnapshot(): Snapshot {
  return {
    platform: new CidrMatcher<MatchedRule>(),
    byTenant: new Map(),
    loadedAt: 0,
    ruleCount: 0,
  };
}

let snapshot: Snapshot | null = null;
let loading: Promise<void> | null = null;
// ioredis 不是本包的直接依赖，类型从 kernel 的工厂反推
type RedisClient = ReturnType<typeof getRedisClient>;
let subscriber: RedisClient | null = null;

/** 配置豁免名单，进程启动时解析一次。 */
let exemptMatcher: CidrMatcher<string> | null = null;

function getExemptMatcher(): CidrMatcher<string> {
  if (exemptMatcher) return exemptMatcher;
  const matcher = new CidrMatcher<string>();
  for (const raw of config.ipAccess.alwaysAllow) {
    const parsed = parseCidr(raw);
    if (!parsed) {
      // 静默跳过就等于豁免名单悄悄少了一条，而它恰恰是「误封后还能进来」的保险
      log.error({ entry: raw }, "IP_ACCESS_ALWAYS_ALLOW 条目不是合法 CIDR，已跳过");
      continue;
    }
    matcher.add(parsed, parsed.cidr);
  }
  exemptMatcher = matcher;
  return matcher;
}

async function loadSnapshot(): Promise<void> {
  // 快照按定义要装下全部租户的规则，再按 tenant_id 分桶给 matchRules 用；
  // 这里就过滤掉的话，跨租户的那一份快照根本无从建立。
  // eslint-disable-next-line tenant-scope/require-tenant-scope
  const rows = await prisma.ipAccessRule.findMany({
    where: {
      OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }],
    },
    select: {
      id: true,
      tenant_id: true,
      cidr: true,
      action: true,
      mode: true,
    },
  });

  const next = emptySnapshot();
  for (const row of rows) {
    const parsed = parseCidr(row.cidr);
    if (!parsed) {
      // 库里存的是归一化结果，理论上解析不回来说明数据被手改过
      log.error({ ruleId: row.id, cidr: row.cidr }, "规则 CIDR 无法解析，已跳过");
      continue;
    }
    const scope: RuleScope = row.tenant_id === null ? "platform" : "tenant";
    const matched: MatchedRule = {
      id: row.id,
      cidr: row.cidr,
      action: row.action as IpRuleAction,
      mode: row.mode as IpRuleMode,
      scope,
    };
    if (row.tenant_id === null) {
      next.platform.add(parsed, matched);
    } else {
      let matcher = next.byTenant.get(row.tenant_id);
      if (!matcher) {
        matcher = new CidrMatcher<MatchedRule>();
        next.byTenant.set(row.tenant_id, matcher);
      }
      matcher.add(parsed, matched);
    }
    next.ruleCount += 1;
  }
  next.loadedAt = Date.now();
  snapshot = next;
}

async function ensureSnapshot(): Promise<Snapshot> {
  const current = snapshot;
  const fresh =
    current !== null &&
    Date.now() - current.loadedAt < config.ipAccess.refreshIntervalMs;
  if (fresh) return current;

  if (!loading) {
    loading = loadSnapshot()
      .catch((error: unknown) => {
        // fail-open：留着旧快照（或空快照）继续跑，不要把请求全拒了
        log.error({ error }, "加载 IP 规则失败，沿用上一份快照");
        if (!snapshot) snapshot = emptySnapshot();
        // 别把 loadedAt 停在 0，否则每个请求都会重试一次加载，
        // 数据库还没恢复就先被自己打垮。
        snapshot.loadedAt = Date.now();
      })
      .finally(() => {
        loading = null;
      });
  }
  await loading;
  return snapshot ?? emptySnapshot();
}

/**
 * 查出覆盖该 IP 的全部规则。`tenantId` 为 null 时只查平台全局规则。
 */
export async function matchRules(
  ip: string,
  tenantId: string | null,
): Promise<{ matched: MatchedRule[]; exempt: boolean }> {
  const addr = parseAddress(ip);
  if (!addr) return { matched: [], exempt: false };

  const exempt = getExemptMatcher().match(addr.version, addr.value).length > 0;
  if (exempt) return { matched: [], exempt: true };

  const current = await ensureSnapshot();
  const matched = current.platform.match(addr.version, addr.value);
  if (tenantId) {
    const tenantMatcher = current.byTenant.get(tenantId);
    if (tenantMatcher) {
      matched.push(...tenantMatcher.match(addr.version, addr.value));
    }
  }
  return { matched, exempt: false };
}

/** 本进程立即失效 + 广播给其它实例。写操作后调用。 */
export async function invalidateIpAccessCache(): Promise<void> {
  snapshot = null;
  try {
    await getRedisClient().publish(IP_ACCESS_INVALIDATE_CHANNEL, "1");
  } catch (error) {
    // Redis 不可用只是让其它实例晚 refreshIntervalMs 收敛，不该让写操作失败
    log.warn({ error }, "广播 IP 规则失效失败，其它实例将按 TTL 收敛");
  }
}

/** 订阅其它实例的失效广播。启动时调用一次。 */
export function subscribeIpAccessInvalidation(): void {
  if (subscriber) return;
  try {
    const client = getRedisClient().duplicate();
    client.on("error", (error: Error) => {
      log.warn({ error }, "IP 规则失效订阅连接出错");
    });
    void client.subscribe(IP_ACCESS_INVALIDATE_CHANNEL).catch((error: unknown) => {
      log.warn({ error }, "订阅 IP 规则失效频道失败，退化为 TTL 轮询");
    });
    client.on("message", (channel: string) => {
      if (channel === IP_ACCESS_INVALIDATE_CHANNEL) {
        snapshot = null;
      }
    });
    subscriber = client;
  } catch (error) {
    log.warn({ error }, "无法建立 IP 规则失效订阅，退化为 TTL 轮询");
  }
}

export async function closeIpAccessSubscription(): Promise<void> {
  if (!subscriber) return;
  const client = subscriber;
  subscriber = null;
  try {
    await client.quit();
  } catch {
    // 关闭失败不影响进程退出
  }
}

/** 仅供测试：清掉进程内状态。 */
export function resetIpAccessCacheForTest(): void {
  snapshot = null;
  loading = null;
  exemptMatcher = null;
}

export function getIpAccessCacheStatus(): {
  loaded: boolean;
  rule_count: number;
  loaded_at: string | null;
} {
  return {
    loaded: snapshot !== null && snapshot.loadedAt > 0,
    rule_count: snapshot?.ruleCount ?? 0,
    loaded_at: snapshot?.loadedAt ? new Date(snapshot.loadedAt).toISOString() : null,
  };
}
