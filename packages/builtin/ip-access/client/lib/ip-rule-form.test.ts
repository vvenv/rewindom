import { describe, it, expect } from "vitest";

import {
  buildIpRulePayload,
  INITIAL_IP_RULE_FORM,
  ipv6TooSpecific,
  toDatetimeLocal,
  toIpRuleForm,
  validateIpRuleForm,
  type IpRuleFormValues,
} from "./ip-rule-form.js";

import type { IpAccessRuleDto } from "../../shared/index.js";
import type { TFunction } from "i18next";

const t = ((key: string) => key) as unknown as TFunction;

function form(overrides: Partial<IpRuleFormValues> = {}): IpRuleFormValues {
  return { ...INITIAL_IP_RULE_FORM, cidr: "203.0.113.0/24", reason: "扫描", ...overrides };
}

describe("INITIAL_IP_RULE_FORM", () => {
  it("starts in log-only mode", () => {
    // 新规则先观察再拦人；默认 enforce 会让人在看清命中面之前就上线
    expect(INITIAL_IP_RULE_FORM.mode).toBe("log_only");
  });
});

describe("validateIpRuleForm", () => {
  it("accepts a well-formed rule", () => {
    expect(validateIpRuleForm(form(), t)).toBeNull();
  });

  it("rejects a malformed CIDR", () => {
    expect(validateIpRuleForm(form({ cidr: "not-an-ip" }), t)).not.toBeNull();
    expect(validateIpRuleForm(form({ cidr: "203.0.113.0/33" }), t)).not.toBeNull();
  });

  it("requires a reason", () => {
    expect(validateIpRuleForm(form({ reason: "   " }), t)).not.toBeNull();
  });

  it("rejects an unparseable expiry", () => {
    expect(validateIpRuleForm(form({ expires_at: "yesterday" }), t)).not.toBeNull();
  });

  it("treats an empty expiry as valid (never expires)", () => {
    expect(validateIpRuleForm(form({ expires_at: "" }), t)).toBeNull();
  });
});

describe("buildIpRulePayload", () => {
  it("trims and sends null for an empty expiry", () => {
    const payload = buildIpRulePayload(
      form({ cidr: "  203.0.113.0/24 ", reason: "  扫描  ", expires_at: "" }),
    );
    expect(payload.cidr).toBe("203.0.113.0/24");
    expect(payload.reason).toBe("扫描");
    expect(payload.expires_at).toBeNull();
  });

  it("converts a local expiry to ISO", () => {
    const payload = buildIpRulePayload(form({ expires_at: "2026-09-09T10:30" }));
    expect(payload.expires_at).toBe(
      new Date("2026-09-09T10:30").toISOString(),
    );
  });
});

describe("toIpRuleForm / toDatetimeLocal", () => {
  it("round-trips an expiry through the datetime-local format", () => {
    const iso = new Date("2026-09-09T10:30").toISOString();
    expect(toDatetimeLocal(iso)).toBe("2026-09-09T10:30");
  });

  it("maps a rule onto form values", () => {
    const rule = {
      cidr: "2001:db8::/32",
      action: "allow",
      mode: "enforce",
      reason: "办公出口",
      expires_at: null,
    } as IpAccessRuleDto;
    expect(toIpRuleForm(rule)).toEqual({
      cidr: "2001:db8::/32",
      action: "allow",
      mode: "enforce",
      reason: "办公出口",
      expires_at: "",
    });
  });

  it("returns an empty string for an unparseable timestamp", () => {
    expect(toDatetimeLocal("not-a-date")).toBe("");
  });
});

describe("ipv6TooSpecific", () => {
  it("flags IPv6 rules narrower than /64", () => {
    expect(ipv6TooSpecific("2001:db8::1/128")).toBe(true);
    expect(ipv6TooSpecific("2001:db8::1")).toBe(true);
  });

  it("does not flag /64 or wider, nor any IPv4", () => {
    expect(ipv6TooSpecific("2001:db8:1:2::/64")).toBe(false);
    expect(ipv6TooSpecific("2001:db8::/32")).toBe(false);
    expect(ipv6TooSpecific("203.0.113.7/32")).toBe(false);
  });

  it("does not flag unparseable input (validation reports that separately)", () => {
    expect(ipv6TooSpecific("nonsense")).toBe(false);
  });
});
