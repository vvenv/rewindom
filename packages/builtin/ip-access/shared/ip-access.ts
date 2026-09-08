/**
 * IP 访问规则的共享契约（server / client 都用）。
 */

/**
 * 命中后做什么。
 *
 * `allow` 的优先级高于 `block`：豁免名单必须能压过封禁，否则一条过宽的规则
 * 就能把自己的监控探针、支付回调、办公出口一起锁在外面，而那时你多半也
 * 进不去后台改规则了。
 *
 * 刻意**没有** `challenge`（人机验证）。真正的挑战流程要一个过闸页加一份
 * 「这个访客已通过」的会话状态，横跨 SSR / SPA / API 三条路径，是独立的一块
 * 工作；放一个静默等同于 block 的第三态进来只会骗人。要做时在这里加。
 */
export const IP_RULE_ACTIONS = ["allow", "block"] as const;
export type IpRuleAction = (typeof IP_RULE_ACTIONS)[number];

/**
 * `log_only` 只记录不拦截。
 *
 * 新规则默认落在这一档：先观察几天它实际命中了谁，再切 `enforce`。
 * 这类名单第一版几乎总是比预想的宽。
 */
export const IP_RULE_MODES = ["enforce", "log_only"] as const;
export type IpRuleMode = (typeof IP_RULE_MODES)[number];

/** 规则来源。`auto` 由 abuse 上报写入，带 TTL；`feed` 预留给外部情报源。 */
export const IP_RULE_SOURCES = ["manual", "auto", "feed"] as const;
export type IpRuleSource = (typeof IP_RULE_SOURCES)[number];

export interface IpAccessRuleDto {
  id: string;
  /** null = 平台全局规则，作用于所有 Host */
  tenant_id: string | null;
  cidr: string;
  ip_version: number;
  action: IpRuleAction;
  mode: IpRuleMode;
  reason: string;
  source: IpRuleSource;
  created_by: string;
  expires_at: string | null;
  hit_count: number;
  last_hit_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IpAccessRuleWriteBody {
  cidr: string;
  action?: IpRuleAction;
  mode?: IpRuleMode;
  reason: string;
  /** ISO 串；null / 省略 = 永不过期 */
  expires_at?: string | null;
}

export const IP_RULE_SORTABLE_FIELDS = [
  "cidr",
  "action",
  "mode",
  "source",
  "hit_count",
  "last_hit_at",
  "expires_at",
  "created_at",
  "updated_at",
] as const;

export function isIpRuleAction(value: unknown): value is IpRuleAction {
  return (
    typeof value === "string" &&
    (IP_RULE_ACTIONS as readonly string[]).includes(value)
  );
}

export function isIpRuleMode(value: unknown): value is IpRuleMode {
  return (
    typeof value === "string" &&
    (IP_RULE_MODES as readonly string[]).includes(value)
  );
}

export function isIpRuleSource(value: unknown): value is IpRuleSource {
  return (
    typeof value === "string" &&
    (IP_RULE_SOURCES as readonly string[]).includes(value)
  );
}
