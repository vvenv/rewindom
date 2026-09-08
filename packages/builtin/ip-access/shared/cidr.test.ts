import { describe, it, expect } from "vitest";

import {
  CidrMatcher,
  IPV6_MIN_BLOCK_PREFIX,
  parseAddress,
  parseCidr,
  widenToMinimumBlock,
} from "./cidr.js";

describe("parseCidr", () => {
  it("treats a bare address as a full-length prefix", () => {
    expect(parseCidr("203.0.113.7")?.cidr).toBe("203.0.113.7/32");
    expect(parseCidr("2001:db8::1")?.cidr).toBe("2001:db8::1/128");
  });

  it("zeroes host bits so one network has exactly one spelling", () => {
    // 否则同一个 /24 能写成 256 种字面量，去重和「这条是不是已存在」都判不了
    expect(parseCidr("203.0.113.7/24")?.cidr).toBe("203.0.113.0/24");
    expect(parseCidr("203.0.113.255/24")?.cidr).toBe("203.0.113.0/24");
    expect(parseCidr("2001:db8:0:1:ffff::/32")?.cidr).toBe("2001:db8::/32");
  });

  it("folds IPv4-mapped IPv6 down to IPv4", () => {
    // 必须与 getClientIp 的归一化一致，否则规则与请求永远对不上
    expect(parseCidr("::ffff:203.0.113.7")?.cidr).toBe("203.0.113.7/32");
    expect(parseCidr("::ffff:203.0.113.0/120")?.cidr).toBe("203.0.113.0/24");
    expect(parseCidr("::ffff:203.0.113.7")?.version).toBe(4);
  });

  it("lowercases and compresses IPv6", () => {
    expect(parseCidr("2001:0DB8:0000::/32")?.cidr).toBe("2001:db8::/32");
  });

  it("rejects malformed input", () => {
    for (const bad of [
      "",
      "   ",
      "not-an-ip",
      "203.0.113.7/33",
      "203.0.113.256",
      "2001:db8::/129",
      "203.0.113.0/-1",
    ]) {
      expect(parseCidr(bad)).toBeNull();
    }
  });
});

describe("widenToMinimumBlock", () => {
  it("widens an over-specific IPv6 rule to /64", () => {
    // 家宽整段 /64，封 /128 等于没封
    const parsed = parseCidr("2001:db8:1:2:3:4:5:6/128");
    expect(widenToMinimumBlock(parsed!).cidr).toBe("2001:db8:1:2::/64");
    expect(widenToMinimumBlock(parsed!).prefix).toBe(IPV6_MIN_BLOCK_PREFIX);
  });

  it("leaves IPv4 and already-wide IPv6 untouched", () => {
    const v4 = parseCidr("203.0.113.7/32")!;
    expect(widenToMinimumBlock(v4).cidr).toBe("203.0.113.7/32");
    const wide = parseCidr("2001:db8::/32")!;
    expect(widenToMinimumBlock(wide).cidr).toBe("2001:db8::/32");
  });
});

describe("parseAddress", () => {
  it("accepts single addresses only", () => {
    expect(parseAddress("203.0.113.7")?.version).toBe(4);
    expect(parseAddress("2001:db8::1")?.version).toBe(6);
    expect(parseAddress("203.0.113.0/24")).toBeNull();
  });
});

describe("CidrMatcher", () => {
  function matcherWith(cidrs: string[]): CidrMatcher<string> {
    const matcher = new CidrMatcher<string>();
    for (const cidr of cidrs) {
      matcher.add(parseCidr(cidr)!, cidr);
    }
    return matcher;
  }

  function hits(matcher: CidrMatcher<string>, ip: string): string[] {
    const addr = parseAddress(ip)!;
    return matcher.match(addr.version, addr.value).sort();
  }

  it("matches an address inside an IPv4 network", () => {
    const matcher = matcherWith(["203.0.113.0/24"]);
    expect(hits(matcher, "203.0.113.7")).toEqual(["203.0.113.0/24"]);
    expect(hits(matcher, "203.0.114.7")).toEqual([]);
  });

  it("returns every overlapping rule, not just the first", () => {
    // 调用方要靠这个做 allow 压过 block 的优先级判定
    const matcher = matcherWith([
      "203.0.113.0/24",
      "203.0.113.7/32",
      "203.0.0.0/16",
    ]);
    expect(hits(matcher, "203.0.113.7")).toEqual([
      "203.0.0.0/16",
      "203.0.113.0/24",
      "203.0.113.7/32",
    ]);
  });

  it("matches IPv6 networks", () => {
    const matcher = matcherWith(["2001:db8::/32"]);
    expect(hits(matcher, "2001:db8:dead:beef::1")).toEqual(["2001:db8::/32"]);
    expect(hits(matcher, "2001:db9::1")).toEqual([]);
  });

  it("keeps IPv4 and IPv6 rules from bleeding into each other", () => {
    const matcher = matcherWith(["0.0.0.0/0"]);
    expect(hits(matcher, "203.0.113.7")).toEqual(["0.0.0.0/0"]);
    expect(hits(matcher, "2001:db8::1")).toEqual([]);
  });

  it("matches a /0 catch-all", () => {
    const matcher = matcherWith(["::/0"]);
    expect(hits(matcher, "2001:db8::1")).toEqual(["::/0"]);
  });

  it("treats an IPv4-mapped query as plain IPv4", () => {
    const matcher = matcherWith(["203.0.113.0/24"]);
    expect(hits(matcher, "::ffff:203.0.113.7")).toEqual(["203.0.113.0/24"]);
  });

  it("counts every stored rule", () => {
    expect(matcherWith(["203.0.113.0/24", "203.0.113.0/24"]).size).toBe(2);
  });
});
