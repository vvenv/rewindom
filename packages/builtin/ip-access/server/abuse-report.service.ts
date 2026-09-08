/**
 * 自动封禁的上报入口。
 *
 * 任意模块都能调 `reportAbuse` 说「这个 IP 刚干了件坏事」，本服务负责计数、
 * 到阈值后写一条带 TTL 的 `source: "auto"` 规则。
 *
 * 三条刻意的设计：
 *
 * - **上报永不抛错**。它挂在登录失败之类的路径上，为了封禁逻辑把正常的
 *   「密码错了」变成 500 是本末倒置。
 * - **自动规则一律 `log_only` 起步**。自动判据比人工松，直接 enforce 会误伤；
 *   先积累几天再由平台管理员决定要不要批量转 enforce。
 * - **计数窗口放 Redis**。它是易失的：重启后计数归零，最坏情况是攻击者多试几次。
 *   为这点精度去建一张表不值得。
 */
import { getRedisClient } from "@rewindom/server-kernel/infra/redis.service.js";
import { config } from "@rewindom/server-kernel/lib/config.js";
import { createModuleLogger } from "@rewindom/server-kernel/lib/logger.js";

import { parseAddress } from "../shared/index.js";

import { createIpRule } from "./ip-access.service.js";

const log = createModuleLogger("ip-access");

/** 上报的行为类型，用于计数分桶与规则文案。 */
export type AbuseKind = "login_failure";

export interface ReportAbuseParams {
  ip: string | null;
  kind: AbuseKind;
  /** 落进规则 reason 的补充信息，如被爆破的用户名 */
  detail?: string;
}

function counterKey(kind: AbuseKind, ip: string): string {
  return `ip-access:abuse:${kind}:${ip}`;
}

function thresholdFor(kind: AbuseKind): number {
  switch (kind) {
    case "login_failure":
      return config.ipAccess.loginFailureThreshold;
  }
}

function windowSecondsFor(kind: AbuseKind): number {
  switch (kind) {
    case "login_failure":
      return config.ipAccess.loginFailureWindowMinutes * 60;
  }
}

/**
 * 累计一次不良行为；达到阈值则写入自动封禁规则。
 *
 * 返回是否刚刚触发了封禁，主要给测试与日志用；调用方不必关心。
 */
export async function reportAbuse(
  params: ReportAbuseParams,
): Promise<{ banned: boolean }> {
  if (!config.ipAccess.enabled) return { banned: false };

  const ip = params.ip;
  // 拿不到可信 IP 时什么都不做。计到一个占位 key 上会把所有「IP 未知」的
  // 失败堆成一条规则，然后封掉一个不存在的地址。
  if (!ip || !parseAddress(ip)) return { banned: false };

  const threshold = thresholdFor(params.kind);
  const windowSeconds = windowSecondsFor(params.kind);

  try {
    const redis = getRedisClient();
    const key = counterKey(params.kind, ip);
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }
    if (count < threshold) return { banned: false };

    // 触发后立刻清零，避免窗口内每一次后续失败都再写一条重复规则
    await redis.del(key);

    const expiresAt = new Date(
      Date.now() + config.ipAccess.autoBanMinutes * 60_000,
    );
    await createIpRule({
      scope: { kind: "platform" },
      cidr: ip,
      action: "block",
      // 自动判据比人工松，先只观察；转 enforce 由平台管理员决定
      mode: "log_only",
      reason: params.detail
        ? `自动封禁：${params.kind}（${count} 次 / ${config.ipAccess.loginFailureWindowMinutes} 分钟）— ${params.detail}`
        : `自动封禁：${params.kind}（${count} 次 / ${config.ipAccess.loginFailureWindowMinutes} 分钟）`,
      source: "auto",
      created_by: "system",
      expires_at: expiresAt.toISOString(),
      // 后台判定，没有「发起人」可言，自锁检查不适用
      requester_ip: null,
    });

    log.warn(
      { ip, kind: params.kind, count, expires_at: expiresAt.toISOString() },
      "[ip-access] 触发自动封禁",
    );
    return { banned: true };
  } catch (error) {
    // 已存在同 CIDR 规则（ValidationError）也走这里——重复触发是正常情况，不必吵
    log.debug({ error, ip, kind: params.kind }, "[ip-access] 上报未生效");
    return { banned: false };
  }
}

/** 登录成功后清掉该 IP 的失败计数，避免共享出口的正常用户被慢慢累计到阈值。 */
export async function clearAbuseCounter(
  kind: AbuseKind,
  ip: string | null,
): Promise<void> {
  if (!ip) return;
  try {
    await getRedisClient().del(counterKey(kind, ip));
  } catch {
    // 计数器清不掉只影响统计精度
  }
}
