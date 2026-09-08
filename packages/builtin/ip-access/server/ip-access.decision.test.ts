import { describe, it, expect } from "vitest";

import { decideIpAccess, type MatchedRule } from "./ip-access.decision.js";

function rule(
  overrides: Partial<MatchedRule> & Pick<MatchedRule, "scope" | "action">,
): MatchedRule {
  return {
    id: `${overrides.scope}-${overrides.action}`,
    cidr: "203.0.113.0/24",
    mode: "enforce",
    ...overrides,
  };
}

describe("decideIpAccess", () => {
  it("allows when nothing matches", () => {
    const decision = decideIpAccess({ matched: [], exempt: false });
    expect(decision.outcome).toBe("allow");
    expect(decision.rule).toBeNull();
  });

  it("blocks on a matching platform block rule", () => {
    const blockRule = rule({ scope: "platform", action: "block" });
    const decision = decideIpAccess({ matched: [blockRule], exempt: false });
    expect(decision.outcome).toBe("block");
    expect(decision.rule).toBe(blockRule);
  });

  it("lets allow win over block inside the same scope", () => {
    // 豁免必须能压过封禁，否则一条过宽的规则没有任何补救办法
    const decision = decideIpAccess({
      matched: [
        rule({ scope: "platform", action: "block" }),
        rule({ scope: "platform", action: "allow" }),
      ],
      exempt: false,
    });
    expect(decision.outcome).toBe("allow");
  });

  it("does NOT let a tenant allow override a platform block", () => {
    // 否则每个租户都能给自己加一条 allow 来豁免平台级封禁，
    // 平台就失去了最后的处置手段。
    const decision = decideIpAccess({
      matched: [
        rule({ scope: "platform", action: "block" }),
        rule({ scope: "tenant", action: "allow" }),
      ],
      exempt: false,
    });
    expect(decision.outcome).toBe("block");
    expect(decision.rule?.scope).toBe("platform");
  });

  it("lets a platform allow short-circuit a tenant block", () => {
    const decision = decideIpAccess({
      matched: [
        rule({ scope: "platform", action: "allow" }),
        rule({ scope: "tenant", action: "block" }),
      ],
      exempt: false,
    });
    expect(decision.outcome).toBe("allow");
    expect(decision.rule?.scope).toBe("platform");
  });

  it("applies tenant rules when the platform scope is silent", () => {
    const decision = decideIpAccess({
      matched: [rule({ scope: "tenant", action: "block" })],
      exempt: false,
    });
    expect(decision.outcome).toBe("block");
    expect(decision.rule?.scope).toBe("tenant");
  });

  it("config exemption beats every rule, including a platform catch-all block", () => {
    // 这条是运维的最后一根救命绳：库里被写进 0.0.0.0/0 时仍然进得来
    const decision = decideIpAccess({
      matched: [rule({ scope: "platform", action: "block", cidr: "0.0.0.0/0" })],
      exempt: true,
    });
    expect(decision.outcome).toBe("allow");
    expect(decision.exempt).toBe(true);
  });

  describe("log_only", () => {
    it("does not enforce, but reports what enforcing would have done", () => {
      const shadowed = rule({
        scope: "platform",
        action: "block",
        mode: "log_only",
      });
      const decision = decideIpAccess({
        matched: [shadowed],
        exempt: false,
      });
      expect(decision.outcome).toBe("allow");
      expect(decision.rule).toBeNull();
      expect(decision.shadowOutcome).toBe("block");
      expect(decision.shadowRule).toBe(shadowed);
    });

    it("is skipped when resolving the enforced outcome", () => {
      // log_only 的 allow 不能把 enforce 的 block 挡掉——它整条都不参与执行判定
      const decision = decideIpAccess({
        matched: [
          rule({ scope: "platform", action: "allow", mode: "log_only" }),
          rule({ scope: "platform", action: "block", mode: "enforce" }),
        ],
        exempt: false,
      });
      expect(decision.outcome).toBe("block");
      expect(decision.shadowOutcome).toBe("allow");
    });

    it("keeps every matched rule for hit counting", () => {
      const rules = [
        rule({ scope: "platform", action: "block", mode: "log_only" }),
        rule({ scope: "tenant", action: "block", mode: "enforce" }),
      ];
      expect(decideIpAccess({ matched: rules, exempt: false }).matched).toEqual(
        rules,
      );
    });
  });
});
