import { beforeEach, describe, expect, it, vi } from "vitest";

const serverConfig = { trustedProxies: "uniquelocal" as string | number };
const ipAccessConfig = { extraProxyRanges: [] as string[] };

vi.mock("@rewindom/server-kernel/lib/config.js", () => ({
  config: {
    server: {
      logLevel: "silent",
      isProduction: false,
      isTest: true,
      get trustedProxies() {
        return serverConfig.trustedProxies;
      },
    },
    get ipAccess() {
      return ipAccessConfig;
    },
  },
}));

const {
  isKnownProxyIp,
  isUnwrappedProxyHop,
  matchProxyRange,
  readClaimedVisitorIp,
  resetProxyGuardForTest,
} = await import("./proxy-guard.js");

beforeEach(() => {
  serverConfig.trustedProxies = "uniquelocal";
  ipAccessConfig.extraProxyRanges = [];
  resetProxyGuardForTest();
});

describe("matchProxyRange", () => {
  it("recognises Cloudflare edge addresses", () => {
    // 104.16.0.0/13 与 172.64.0.0/13 是 CF 最常出现的两段
    expect(matchProxyRange("104.16.0.1")).toBe("104.16.0.0/13");
    expect(matchProxyRange("172.68.1.2")).toBe("172.64.0.0/13");
    expect(matchProxyRange("2606:4700::1111")).toBe("2606:4700::/32");
  });

  it("recognises Cloudflare even when this deployment has not enabled CLOUDFLARE_PROXY", () => {
    // 租户可以自己把域名挂到 CF 后面，不通知平台。
    // 护栏必须在那一刻就生效，而不是等运维改配置。
    serverConfig.trustedProxies = "uniquelocal";
    resetProxyGuardForTest();
    expect(isKnownProxyIp("104.16.0.1")).toBe(true);
  });

  it("leaves ordinary public addresses alone", () => {
    for (const ip of ["203.0.113.9", "198.51.100.4", "2001:db8::1"]) {
      expect(matchProxyRange(ip)).toBeNull();
    }
  });

  it("expands proxy-addr preset names from TRUSTED_PROXIES", () => {
    // 配置里写关键字时护栏也要覆盖，否则一个 10.x 冒充访客也不会被发现
    expect(isKnownProxyIp("10.1.2.3")).toBe(true);
    expect(isKnownProxyIp("192.168.1.1")).toBe(true);
  });

  it("covers explicit CIDRs from TRUSTED_PROXIES", () => {
    serverConfig.trustedProxies = "198.51.100.0/24";
    resetProxyGuardForTest();
    expect(matchProxyRange("198.51.100.7")).toBe("198.51.100.0/24");
  });

  it("covers extra ranges from IP_ACCESS_PROXY_RANGES", () => {
    // CF 之外的 CDN / 云 LB 出口段靠这个补
    ipAccessConfig.extraProxyRanges = ["203.0.113.0/24"];
    resetProxyGuardForTest();
    expect(matchProxyRange("203.0.113.9")).toBe("203.0.113.0/24");
  });

  it("falls back to Cloudflare-only when TRUSTED_PROXIES is a hop count", () => {
    // 跳数模式没有网段可摊平，但 CF 段仍然要防
    serverConfig.trustedProxies = 2;
    resetProxyGuardForTest();
    expect(isKnownProxyIp("10.1.2.3")).toBe(false);
    expect(isKnownProxyIp("104.16.0.1")).toBe(true);
  });

  it("skips malformed entries instead of throwing", () => {
    ipAccessConfig.extraProxyRanges = ["garbage", "203.0.113.0/24"];
    resetProxyGuardForTest();
    expect(isKnownProxyIp("203.0.113.9")).toBe(true);
  });

  it("returns null for an unparseable address", () => {
    expect(matchProxyRange("not-an-ip")).toBeNull();
  });
});

describe("readClaimedVisitorIp", () => {
  it("prefers CF-Connecting-IP", () => {
    expect(
      readClaimedVisitorIp({ "cf-connecting-ip": "198.51.100.9" }),
    ).toBe("198.51.100.9");
  });

  it("falls back to True-Client-IP", () => {
    expect(readClaimedVisitorIp({ "true-client-ip": "198.51.100.9" })).toBe(
      "198.51.100.9",
    );
  });

  it("ignores X-Forwarded-For — clients can write that themselves", () => {
    expect(
      readClaimedVisitorIp({ "x-forwarded-for": "198.51.100.9, 172.68.1.2" }),
    ).toBeNull();
  });
});

describe("isUnwrappedProxyHop", () => {
  it("is true when a CF edge IP arrives with a different visitor header", () => {
    // 橙云回源、TRUSTED_PROXIES 没信 CF 段：解析停在边缘，头里却写着访客
    expect(
      isUnwrappedProxyHop("172.68.1.2", {
        "cf-connecting-ip": "198.51.100.9",
      }),
    ).toBe(true);
  });

  it("is false when the peer is in a CF range but there is no visitor header", () => {
    // Workers 出站 / 扫描器 / WARP：对端自己就在 172.64.0.0/13
    expect(isUnwrappedProxyHop("172.68.1.2", {})).toBe(false);
    expect(isUnwrappedProxyHop("172.68.1.2")).toBe(false);
  });

  it("is false when the visitor header repeats the same CF edge IP", () => {
    expect(
      isUnwrappedProxyHop("172.68.1.2", { "cf-connecting-ip": "172.68.1.2" }),
    ).toBe(false);
  });

  it("is false for an ordinary public client IP even with a visitor header", () => {
    expect(
      isUnwrappedProxyHop("203.0.113.9", {
        "cf-connecting-ip": "198.51.100.9",
      }),
    ).toBe(false);
  });
});
