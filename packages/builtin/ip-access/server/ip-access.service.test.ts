import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockFindFirst,
  mockCreate,
  mockUpdate,
  mockDelete,
  mockDeleteMany,
  mockUpdateMany,
} = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
  mockDeleteMany: vi.fn(),
  mockUpdateMany: vi.fn(),
}));

vi.mock("@rewindom/server-kernel/lib/config.js", () => ({
  config: {
    // nginx-export 会经 createModuleLogger 读 server.logLevel
    server: { logLevel: "silent", isProduction: false, isTest: true, trustedProxies: "uniquelocal" },
    ipAccess: {
      enabled: true,
      refreshIntervalMs: 15_000,
      alwaysAllow: [],
      autoBanMinutes: 60,
      loginFailureThreshold: 10,
      loginFailureWindowMinutes: 15,
      nginxExportPath: "",
      extraProxyRanges: [],
    },
  },
}));

vi.mock("@rewindom/server-kernel/lib/prisma.js", () => ({
  prisma: {
    ipAccessRule: {
      findFirst: mockFindFirst,
      findMany: vi.fn(),
      count: vi.fn(),
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
      deleteMany: mockDeleteMany,
      updateMany: mockUpdateMany,
    },
  },
}));

vi.mock("./ip-access.cache.js", () => ({
  invalidateIpAccessCache: vi.fn().mockResolvedValue(undefined),
}));

const {
  createIpRule,
  deleteIpRule,
  flushRuleHits,
  purgeExpiredIpRules,
  recordRuleHits,
  resetRuleHitBufferForTest,
  updateIpRule,
} = await import("./ip-access.service.js");

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "rule-1",
    tenant_id: null,
    cidr: "203.0.113.0/24",
    ip_version: 4,
    action: "block",
    mode: "log_only",
    reason: "扫描",
    source: "manual",
    created_by: "admin",
    expires_at: null,
    hit_count: 0,
    last_hit_at: null,
    created_at: new Date("2026-09-08T00:00:00Z"),
    updated_at: new Date("2026-09-08T00:00:00Z"),
    ...overrides,
  };
}

const PLATFORM = { kind: "platform" } as const;
const TENANT = { kind: "tenant", tenant_id: "t1" } as const;

beforeEach(() => {
  vi.clearAllMocks();
  resetRuleHitBufferForTest();
  mockUpdateMany.mockResolvedValue({ count: 1 });
  mockFindFirst.mockResolvedValue(null);
  mockCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
    Promise.resolve(row(data)),
  );
});

describe("createIpRule", () => {
  it("normalizes the CIDR before storing it", async () => {
    // 主机位不清零的话同一个网段有 256 种写法，去重和查重都无从谈起
    await createIpRule({
      scope: PLATFORM,
      cidr: "203.0.113.77/24",
      reason: "扫描",
      created_by: "admin",
      requester_ip: null,
    });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ cidr: "203.0.113.0/24", ip_version: 4 }),
      }),
    );
  });

  it("defaults to log_only so a new rule cannot lock anyone out on day one", async () => {
    await createIpRule({
      scope: PLATFORM,
      cidr: "203.0.113.0/24",
      reason: "扫描",
      created_by: "admin",
      requester_ip: null,
    });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ mode: "log_only", action: "block" }),
      }),
    );
  });

  it("scopes platform rules with tenant_id null and tenant rules with the id", async () => {
    await createIpRule({
      scope: TENANT,
      cidr: "203.0.113.0/24",
      reason: "骚扰",
      created_by: "u1",
      requester_ip: null,
    });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tenant_id: "t1" }),
      }),
    );
  });

  it("rejects a malformed CIDR", async () => {
    await expect(
      createIpRule({
        scope: PLATFORM,
        cidr: "not-an-ip",
        reason: "x",
        created_by: "admin",
        requester_ip: null,
      }),
    ).rejects.toMatchObject({ code: "ip_access.invalid_cidr" });
  });

  it("requires a reason", async () => {
    await expect(
      createIpRule({
        scope: PLATFORM,
        cidr: "203.0.113.0/24",
        reason: "   ",
        created_by: "admin",
        requester_ip: null,
      }),
    ).rejects.toMatchObject({ code: "ip_access.reason_required" });
  });

  it("rejects a duplicate inside the same scope", async () => {
    mockFindFirst.mockResolvedValueOnce({ id: "existing" });
    await expect(
      createIpRule({
        scope: PLATFORM,
        cidr: "203.0.113.0/24",
        reason: "扫描",
        created_by: "admin",
        requester_ip: null,
      }),
    ).rejects.toMatchObject({ code: "ip_access.duplicate" });
  });

  describe("automatic rules", () => {
    it("must carry an expiry", async () => {
      // 自动写入的规则没人会回头清理
      await expect(
        createIpRule({
          scope: PLATFORM,
          cidr: "203.0.113.7",
          reason: "爆破",
          source: "auto",
          created_by: "system",
          requester_ip: null,
        }),
      ).rejects.toMatchObject({ code: "ip_access.auto_requires_expiry" });
    });

    it("widen an over-specific IPv6 address to /64", async () => {
      // 封 /128 等于没封：家宽整段拿一个 /64
      await createIpRule({
        scope: PLATFORM,
        cidr: "2001:db8:1:2:3:4:5:6",
        reason: "爆破",
        source: "auto",
        created_by: "system",
        expires_at: new Date(Date.now() + 3_600_000).toISOString(),
        requester_ip: null,
      });
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ cidr: "2001:db8:1:2::/64" }),
        }),
      );
    });

    it("leaves IPv4 alone", async () => {
      await createIpRule({
        scope: PLATFORM,
        cidr: "203.0.113.7",
        reason: "爆破",
        source: "auto",
        created_by: "system",
        expires_at: new Date(Date.now() + 3_600_000).toISOString(),
        requester_ip: null,
      });
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ cidr: "203.0.113.7/32" }),
        }),
      );
    });
  });

  describe("self-lockout guard", () => {
    it("refuses an enforcing block that covers the requester's own IP", async () => {
      await expect(
        createIpRule({
          scope: PLATFORM,
          cidr: "203.0.113.0/24",
          action: "block",
          mode: "enforce",
          reason: "扫描",
          created_by: "admin",
          requester_ip: "203.0.113.9",
        }),
      ).rejects.toMatchObject({ code: "ip_access.self_lockout" });
    });

    it("allows the same rule in log_only mode", async () => {
      // log_only 不拦人，观察自己的流量正是它的用途
      await expect(
        createIpRule({
          scope: PLATFORM,
          cidr: "203.0.113.0/24",
          action: "block",
          mode: "log_only",
          reason: "扫描",
          created_by: "admin",
          requester_ip: "203.0.113.9",
        }),
      ).resolves.toBeDefined();
    });

    it("never blocks an allow rule covering the requester", async () => {
      await expect(
        createIpRule({
          scope: PLATFORM,
          cidr: "203.0.113.0/24",
          action: "allow",
          mode: "enforce",
          reason: "办公出口",
          created_by: "admin",
          requester_ip: "203.0.113.9",
        }),
      ).resolves.toBeDefined();
    });

    it("ignores a rule that does not cover the requester", async () => {
      await expect(
        createIpRule({
          scope: PLATFORM,
          cidr: "198.51.100.0/24",
          action: "block",
          mode: "enforce",
          reason: "扫描",
          created_by: "admin",
          requester_ip: "203.0.113.9",
        }),
      ).resolves.toBeDefined();
    });

    it("catches a catch-all block", async () => {
      await expect(
        createIpRule({
          scope: PLATFORM,
          cidr: "0.0.0.0/0",
          action: "block",
          mode: "enforce",
          reason: "默认拒绝",
          created_by: "admin",
          requester_ip: "203.0.113.9",
        }),
      ).rejects.toMatchObject({ code: "ip_access.self_lockout" });
    });
  });
});

describe("updateIpRule", () => {
  it("applies the self-lockout guard to the post-update state", async () => {
    // 只传 mode 时也要按「改完之后」判断，不能因为增量里没有 action 就放行
    mockFindFirst.mockResolvedValueOnce(
      row({ cidr: "203.0.113.0/24", action: "block", mode: "log_only" }),
    );
    await expect(
      updateIpRule({
        scope: PLATFORM,
        rule_id: "rule-1",
        mode: "enforce",
        requester_ip: "203.0.113.9",
      }),
    ).rejects.toMatchObject({ code: "ip_access.self_lockout" });
  });

  it("404s for a rule outside the scope", async () => {
    mockFindFirst.mockResolvedValueOnce(null);
    await expect(
      updateIpRule({
        scope: TENANT,
        rule_id: "rule-1",
        reason: "x",
        requester_ip: null,
      }),
    ).rejects.toMatchObject({ code: "ip_access.not_found" });
  });

  it("carries the scope into the update where clause", async () => {
    mockFindFirst.mockResolvedValueOnce(row({ tenant_id: "t1" }));
    mockUpdate.mockResolvedValueOnce(row({ tenant_id: "t1", reason: "改了" }));
    await updateIpRule({
      scope: TENANT,
      rule_id: "rule-1",
      reason: "改了",
      requester_ip: null,
    });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "rule-1", tenant_id: "t1" },
      }),
    );
  });
});

describe("deleteIpRule", () => {
  it("refuses to delete across scopes", async () => {
    mockFindFirst.mockResolvedValueOnce(null);
    await expect(deleteIpRule(TENANT, "rule-1")).rejects.toMatchObject({
      code: "ip_access.not_found",
    });
    expect(mockDelete).not.toHaveBeenCalled();
  });
});

describe("purgeExpiredIpRules", () => {
  it("only deletes rules with an expiry in the past", async () => {
    mockDeleteMany.mockResolvedValueOnce({ count: 3 });
    await expect(purgeExpiredIpRules()).resolves.toBe(3);
    const where = mockDeleteMany.mock.calls[0]?.[0]?.where as {
      expires_at: { not: null; lt: Date };
    };
    expect(where.expires_at.not).toBeNull();
    expect(where.expires_at.lt).toBeInstanceOf(Date);
  });
});

describe("recordRuleHits", () => {
  it("does not write to the database on the request path", async () => {
    // 每请求一次写意味着：命中越频繁写得越多。一个被封的 IP 以 1000 rps
    // 打进来就是每秒 1000 次数据库写——攻击越猛，你自己压垮数据库越快。
    for (let i = 0; i < 1000; i += 1) {
      recordRuleHits(["rule-1"]);
    }
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it("collapses buffered hits into one write per rule", async () => {
    for (let i = 0; i < 1000; i += 1) {
      recordRuleHits(["rule-1"]);
    }
    await flushRuleHits();

    expect(mockUpdateMany).toHaveBeenCalledTimes(1);
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "rule-1" },
        data: expect.objectContaining({ hit_count: { increment: 1000 } }),
      }),
    );
  });

  it("writes once per distinct rule", async () => {
    recordRuleHits(["rule-1", "rule-2"]);
    recordRuleHits(["rule-2"]);
    await flushRuleHits();
    expect(mockUpdateMany).toHaveBeenCalledTimes(2);
  });

  it("clears the buffer so a second flush is a no-op", async () => {
    recordRuleHits(["rule-1"]);
    await flushRuleHits();
    mockUpdateMany.mockClear();
    await flushRuleHits();
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it("ignores an empty batch", () => {
    recordRuleHits([]);
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it("never rejects when the write fails", async () => {
    // 命中统计不值得为它失败任何东西
    mockUpdateMany.mockRejectedValue(new Error("db down"));
    recordRuleHits(["rule-1"]);
    await expect(flushRuleHits()).resolves.toBeUndefined();
  });
});
