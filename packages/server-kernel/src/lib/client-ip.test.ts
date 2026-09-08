import { describe, it, expect } from "vitest";

import { getClientIp, normalizeIp } from "./client-ip.js";

describe("normalizeIp", () => {
  it("keeps a plain IPv4 address as-is", () => {
    expect(normalizeIp("203.0.113.7")).toBe("203.0.113.7");
  });

  it("unwraps IPv4-mapped IPv6 to the bare IPv4 form", () => {
    // Node 双栈监听把 IPv4 连接报成 ::ffff:x.x.x.x，而代理传来的 XFF 是裸 IPv4。
    // 两者必须收敛成同一个字符串，否则同一个客户端在限流 / 封禁里算两个身份。
    expect(normalizeIp("::ffff:203.0.113.7")).toBe("203.0.113.7");
    expect(normalizeIp("::FFFF:203.0.113.7")).toBe("203.0.113.7");
    expect(normalizeIp("::ffff:203.0.113.7")).toBe(normalizeIp("203.0.113.7"));
  });

  it("lowercases IPv6 so casing does not fork the identity", () => {
    expect(normalizeIp("2001:DB8::1")).toBe("2001:db8::1");
  });

  it("strips the port from an IPv4 address", () => {
    expect(normalizeIp("203.0.113.7:54321")).toBe("203.0.113.7");
  });

  it("unwraps bracketed IPv6 literals with and without a port", () => {
    expect(normalizeIp("[2001:db8::1]")).toBe("2001:db8::1");
    expect(normalizeIp("[2001:db8::1]:443")).toBe("2001:db8::1");
  });

  it("does not mistake IPv6 colons for a port separator", () => {
    expect(normalizeIp("2001:db8::1")).toBe("2001:db8::1");
    expect(normalizeIp("::1")).toBe("::1");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeIp("  203.0.113.7  ")).toBe("203.0.113.7");
  });

  it("returns null for anything that is not an IP", () => {
    for (const value of [
      undefined,
      null,
      "",
      "   ",
      "unknown",
      "not-an-ip",
      "999.999.999.999",
      "203.0.113.7, 198.51.100.4",
      "[2001:db8::1",
    ]) {
      expect(normalizeIp(value)).toBeNull();
    }
  });
});

describe("getClientIp", () => {
  it("reads and normalizes request.ip", () => {
    expect(getClientIp({ ip: "::ffff:198.51.100.4" })).toBe("198.51.100.4");
  });

  it("returns null when the request has no usable ip", () => {
    // 调用方必须显式处理 null，不能回退成固定占位串——那会把所有拿不到 IP 的
    // 请求塞进同一个限流桶 / 同一条封禁规则。
    expect(getClientIp({})).toBeNull();
    expect(getClientIp({ ip: "" })).toBeNull();
  });
});
