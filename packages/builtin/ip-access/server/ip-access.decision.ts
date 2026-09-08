/**
 * 判定逻辑 —— 纯函数，不碰 DB / 请求对象，便于把优先级本身钉在测试里。
 *
 * 优先级从高到低：
 *
 *   1. 配置豁免名单（`IP_ACCESS_ALWAYS_ALLOW`）
 *   2. 平台 allow
 *   3. 平台 block
 *   4. 租户 allow
 *   5. 租户 block
 *   6. 默认放行
 *
 * 两处刻意的不对称：
 *
 * - **配置豁免压过一切**。它装的是「被误封就没人能修」的地址——监控、健康检查、
 *   支付回调、自己的办公出口。它不在库里，所以即使数据库里被写进一条 `0.0.0.0/0`
 *   的封禁，运维仍然进得来。
 * - **租户 allow 压不过平台 block**。否则任何一个租户都能给自己站点加一条 allow
 *   来豁免平台级封禁，平台就失去了最后的处置手段。
 */
import type { IpRuleAction, IpRuleMode } from "../shared/index.js";

export type RuleScope = "platform" | "tenant";

export interface MatchedRule {
  id: string;
  cidr: string;
  action: IpRuleAction;
  mode: IpRuleMode;
  scope: RuleScope;
}

export interface IpDecision {
  /** 实际执行的结果（只看 `enforce` 模式的规则） */
  outcome: IpRuleAction;
  /** 促成 `outcome` 的规则；默认放行或命中配置豁免时为 null */
  rule: MatchedRule | null;
  /** 命中配置豁免名单 */
  exempt: boolean;
  /**
   * 把 `log_only` 规则也算上会得到的结果。
   *
   * 与 `outcome` 不同时说明「有条规则正在观察期，切 enforce 就会拦下这个请求」——
   * 这正是 dry-run 要看的东西。
   */
  shadowOutcome: IpRuleAction;
  shadowRule: MatchedRule | null;
  /** 本次命中的全部规则（含 log_only），用于命中计数 */
  matched: MatchedRule[];
}

const SCOPE_ORDER: RuleScope[] = ["platform", "tenant"];

function resolve(rules: MatchedRule[]): {
  outcome: IpRuleAction;
  rule: MatchedRule | null;
} {
  for (const scope of SCOPE_ORDER) {
    const inScope = rules.filter((rule) => rule.scope === scope);
    if (inScope.length === 0) continue;

    const allow = inScope.find((rule) => rule.action === "allow");
    if (allow) return { outcome: "allow", rule: allow };

    const deny = inScope.find((rule) => rule.action === "block");
    if (deny) return { outcome: "block", rule: deny };
  }
  return { outcome: "allow", rule: null };
}

export function decideIpAccess(params: {
  matched: MatchedRule[];
  exempt: boolean;
}): IpDecision {
  const { matched, exempt } = params;

  if (exempt) {
    return {
      outcome: "allow",
      rule: null,
      exempt: true,
      shadowOutcome: "allow",
      shadowRule: null,
      matched,
    };
  }

  const enforced = resolve(matched.filter((rule) => rule.mode === "enforce"));
  const shadow = resolve(matched);

  return {
    outcome: enforced.outcome,
    rule: enforced.rule,
    exempt: false,
    shadowOutcome: shadow.outcome,
    shadowRule: shadow.rule,
    matched,
  };
}
