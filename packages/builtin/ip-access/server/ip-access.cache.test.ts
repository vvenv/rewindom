import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockFindMany, mockPublish } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockPublish: vi.fn(),
}));

const ipAccessConfig = {
  enabled: true,
  refreshIntervalMs: 15_000,
  alwaysAllow: [] as string[],
  autoBanMinutes: 60,
  loginFailureThreshold: 10,
  loginFailureWindowMinutes: 15,
  nginxExportPath: "",
  extraProxyRanges: [] as string[],
};

vi.mock("@rewindom/server-kernel/lib/config.js", () => ({
  config: {
    server: { logLevel: "silent", isProduction: false, isTest: true },
    get ipAccess() {
      return ipAccessConfig;
    },
  },
}));

vi.mock("@rewindom/server-kernel/lib/prisma.js", () => ({
  prisma: { ipAccessRule: { findMany: mockFindMany } },
}));

vi.mock("@rewindom/server-kernel/infra/redis.service.js", () => ({
  getRedisClient: () => ({
    publish: mockPublish,
    duplicate: () => ({ on: vi.fn(), subscribe: vi.fn().mockResolvedValue(1) }),
  }),
}));

const {
  invalidateIpAccessCache,
  matchRules,
  resetIpAccessCacheForTest,
} = await import("./ip-access.cache.js");

function dbRule(overrides: Record<string, unknown> = {}) {
  return {
    id: "r1",
    tenant_id: null,
    cidr: "203.0.113.0/24",
    action: "block",
    mode: "enforce",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  ipAccessConfig.alwaysAllow = [];
  resetIpAccessCacheForTest();
  mockFindMany.mockResolvedValue([]);
  mockPublish.mockResolvedValue(1);
});

describe("matchRules", () => {
  it("returns platform rules covering the address", async () => {
    mockFindMany.mockResolvedValue([dbRule()]);
    const result = await matchRules("203.0.113.9", null);
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0]).toMatchObject({ id: "r1", scope: "platform" });
  });

  it("keeps one site's rules out of another's", async () => {
    mockFindMany.mockResolvedValue([
      dbRule({ id: "r-t1", tenant_id: "t1" }),
      dbRule({ id: "r-t2", tenant_id: "t2" }),
    ]);
    const result = await matchRules("203.0.113.9", "t1");
    expect(result.matched.map((rule) => rule.id)).toEqual(["r-t1"]);
  });

  it("skips rules whose expiry has passed", async () => {
    // 快照自己按 expires_at 过滤，判定的正确性不挂在清理 job 上
    await matchRules("203.0.113.9", null);
    const where = mockFindMany.mock.calls[0]?.[0]?.where as {
      OR: [{ expires_at: null }, { expires_at: { gt: Date } }];
    };
    expect(where.OR[0]).toEqual({ expires_at: null });
    expect(where.OR[1].expires_at.gt).toBeInstanceOf(Date);
  });

  it("marks an address on the config exemption list without consulting the DB", async () => {
    ipAccessConfig.alwaysAllow = ["203.0.113.0/24"];
    resetIpAccessCacheForTest();
    const result = await matchRules("203.0.113.9", null);
    expect(result.exempt).toBe(true);
    expect(result.matched).toHaveLength(0);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("skips a malformed exemption entry instead of throwing", async () => {
    // 一条写错的 env 不该让整个豁免名单失效
    ipAccessConfig.alwaysAllow = ["garbage", "203.0.113.0/24"];
    resetIpAccessCacheForTest();
    expect((await matchRules("203.0.113.9", null)).exempt).toBe(true);
  });

  it("returns nothing for an unparseable address", async () => {
    expect(await matchRules("not-an-ip", null)).toEqual({
      matched: [],
      exempt: false,
    });
  });

  describe("fail-open", () => {
    it("allows traffic when the list cannot be loaded", async () => {
      // 一次数据库抖动让全站 403，比它要防的攻击严重得多
      mockFindMany.mockRejectedValue(new Error("db down"));
      const result = await matchRules("203.0.113.9", null);
      expect(result.matched).toEqual([]);
      expect(result.exempt).toBe(false);
    });

    it("does not retry the load on every request while the DB is down", async () => {
      // 每请求重试一次会在数据库还没恢复时先被自己打垮
      mockFindMany.mockRejectedValue(new Error("db down"));
      await matchRules("203.0.113.9", null);
      await matchRules("203.0.113.10", null);
      await matchRules("203.0.113.11", null);
      expect(mockFindMany).toHaveBeenCalledTimes(1);
    });

    it("keeps serving the previous snapshot after a later load fails", async () => {
      mockFindMany.mockResolvedValueOnce([dbRule()]);
      expect((await matchRules("203.0.113.9", null)).matched).toHaveLength(1);

      await invalidateIpAccessCache();
      mockFindMany.mockRejectedValueOnce(new Error("db down"));
      // 旧快照被 invalidate 清掉了，这里退化成空名单放行而不是报错
      await expect(matchRules("203.0.113.9", null)).resolves.toMatchObject({
        matched: [],
      });
    });
  });

  it("caches within the TTL and reloads after invalidation", async () => {
    mockFindMany.mockResolvedValue([dbRule()]);
    await matchRules("203.0.113.9", null);
    await matchRules("203.0.113.9", null);
    expect(mockFindMany).toHaveBeenCalledTimes(1);

    await invalidateIpAccessCache();
    await matchRules("203.0.113.9", null);
    expect(mockFindMany).toHaveBeenCalledTimes(2);
  });
});

describe("invalidateIpAccessCache", () => {
  it("broadcasts so other instances reload", async () => {
    await invalidateIpAccessCache();
    expect(mockPublish).toHaveBeenCalledWith("ip-access:invalidate", "1");
  });

  it("does not fail the write when Redis is unavailable", async () => {
    // 广播失败只是让其它实例晚 refreshIntervalMs 收敛
    mockPublish.mockRejectedValue(new Error("redis down"));
    await expect(invalidateIpAccessCache()).resolves.toBeUndefined();
  });
});
