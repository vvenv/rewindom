import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPipeline, mockZmscore, mockDel, pipelineCalls } = vi.hoisted(() => {
  const calls: { cmd: string; args: unknown[] }[] = [];
  const chain = {
    zincrby: (...args: unknown[]) => {
      calls.push({ cmd: "zincrby", args });
      return chain;
    },
    expire: (...args: unknown[]) => {
      calls.push({ cmd: "expire", args });
      return chain;
    },
    zunionstore: (...args: unknown[]) => {
      calls.push({ cmd: "zunionstore", args });
      return chain;
    },
    zrevrange: (...args: unknown[]) => {
      calls.push({ cmd: "zrevrange", args });
      return chain;
    },
    zremrangebyrank: (...args: unknown[]) => {
      calls.push({ cmd: "zremrangebyrank", args });
      return chain;
    },
    exec: vi.fn(),
  };
  return {
    mockPipeline: vi.fn(() => chain),
    mockZmscore: vi.fn(),
    mockDel: vi.fn(),
    pipelineCalls: calls,
  };
});

const ipAccessConfig = {
  trafficStats: true,
  trafficBucketSeconds: 300,
  trafficBuckets: 12,
  trafficMaxTracked: 2000,
};

vi.mock("@rewindom/server-kernel/lib/config.js", () => ({
  config: {
    server: { logLevel: "silent", isProduction: false, isTest: true },
    get ipAccess() {
      return ipAccessConfig;
    },
  },
}));

vi.mock("@rewindom/server-kernel/infra/redis.service.js", () => ({
  getRedisClient: () => ({
    pipeline: mockPipeline,
    zmscore: mockZmscore,
    del: mockDel,
  }),
}));

const {
  getTopTrafficSources,
  getTrafficWindowMinutes,
  recordTrafficSample,
  trimTrafficBuckets,
} = await import("./traffic-stats.service.js");

function sample(overrides: Record<string, unknown> = {}) {
  return {
    duration_ms: 12,
    status_code: 200,
    route: "/api/thing",
    path: "/api/thing",
    method: "GET",
    tenant_slug: null,
    user_id: null,
    username: null,
    request_id: "r1",
    ip_address: "203.0.113.9",
    source: "http" as const,
    ...overrides,
  };
}

/** recordTrafficSample 刻意不 await，测试要等微任务跑完 */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  vi.clearAllMocks();
  pipelineCalls.length = 0;
  ipAccessConfig.trafficStats = true;
});

describe("recordTrafficSample", () => {
  it("counts a successful request without touching the error bucket", async () => {
    recordTrafficSample(sample());
    await flush();
    const zincrby = pipelineCalls.filter((c) => c.cmd === "zincrby");
    expect(zincrby).toHaveLength(1);
    expect(String(zincrby[0]?.args[0])).toContain(":total:");
    expect(zincrby[0]?.args[2]).toBe("203.0.113.9");
  });

  it("counts a 4xx into both total and error buckets", async () => {
    recordTrafficSample(sample({ status_code: 404 }));
    await flush();
    const keys = pipelineCalls
      .filter((c) => c.cmd === "zincrby")
      .map((c) => String(c.args[0]));
    expect(keys.some((k) => k.includes(":total:"))).toBe(true);
    expect(keys.some((k) => k.includes(":error:"))).toBe(true);
  });

  it("counts 5xx as an error too", async () => {
    recordTrafficSample(sample({ status_code: 502 }));
    await flush();
    expect(
      pipelineCalls.some((c) => String(c.args[0]).includes(":error:")),
    ).toBe(true);
  });

  it("drops samples with no trusted IP", async () => {
    // 记成 "unknown" 会让那一行永远排在榜首，却指不出任何可处置的对象
    recordTrafficSample(sample({ ip_address: null }));
    await flush();
    expect(pipelineCalls).toHaveLength(0);
  });

  it("always sets a TTL so buckets expire without a cleanup job", async () => {
    recordTrafficSample(sample());
    await flush();
    expect(pipelineCalls.some((c) => c.cmd === "expire")).toBe(true);
  });

  it("does nothing when the feature is off", async () => {
    ipAccessConfig.trafficStats = false;
    recordTrafficSample(sample());
    await flush();
    expect(pipelineCalls).toHaveLength(0);
  });

  it("never throws when Redis is unavailable", async () => {
    mockPipeline.mockImplementationOnce(() => {
      throw new Error("redis down");
    });
    expect(() => recordTrafficSample(sample())).not.toThrow();
    await flush();
  });
});

describe("getTopTrafficSources", () => {
  it("merges the window and computes an error rate per source", async () => {
    const chain = mockPipeline();
    pipelineCalls.length = 0;
    (chain.exec as ReturnType<typeof vi.fn>).mockResolvedValue([
      [null, "OK"],
      [null, 1],
      [null, "OK"],
      [null, 1],
      [null, ["203.0.113.9", "100", "198.51.100.4", "40"]],
    ]);
    mockZmscore.mockResolvedValue(["50", null]);

    const result = await getTopTrafficSources(10);

    expect(result).toEqual([
      { ip: "203.0.113.9", requests: 100, errors: 50, error_rate: 0.5 },
      { ip: "198.51.100.4", requests: 40, errors: 0, error_rate: 0 },
    ]);
  });

  it("merges exactly the configured number of buckets", async () => {
    const chain = mockPipeline();
    pipelineCalls.length = 0;
    (chain.exec as ReturnType<typeof vi.fn>).mockResolvedValue([
      [null, "OK"],
      [null, 1],
      [null, "OK"],
      [null, 1],
      [null, []],
    ]);
    await getTopTrafficSources(10);
    const union = pipelineCalls.find((c) => c.cmd === "zunionstore");
    expect(union?.args[1]).toBe(12);
  });

  it("cleans up the temporary merge keys even when nothing matched", async () => {
    // 不清理的话每次查询都会在 Redis 里留下一对临时 key
    const chain = mockPipeline();
    pipelineCalls.length = 0;
    (chain.exec as ReturnType<typeof vi.fn>).mockResolvedValue([
      [null, "OK"],
      [null, 1],
      [null, "OK"],
      [null, 1],
      [null, []],
    ]);
    await getTopTrafficSources(10);
    expect(mockDel).toHaveBeenCalled();
  });

  it("returns an empty list instead of throwing when Redis fails", async () => {
    mockPipeline.mockImplementationOnce(() => {
      throw new Error("redis down");
    });
    await expect(getTopTrafficSources(10)).resolves.toEqual([]);
  });

  it("returns nothing when the feature is off", async () => {
    ipAccessConfig.trafficStats = false;
    await expect(getTopTrafficSources(10)).resolves.toEqual([]);
  });
});

describe("trimTrafficBuckets", () => {
  it("keeps only the busiest sources in every bucket", async () => {
    // 不裁的话一次 /16 扫描就能往每个桶塞进上万个只出现过一次的 IP
    const chain = mockPipeline();
    pipelineCalls.length = 0;
    (chain.exec as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    await trimTrafficBuckets();
    const trims = pipelineCalls.filter((c) => c.cmd === "zremrangebyrank");
    expect(trims).toHaveLength(24); // total + error，各 12 个桶
    expect(trims[0]?.args[1]).toBe(0);
    expect(trims[0]?.args[2]).toBe(-2001);
  });
});

describe("getTrafficWindowMinutes", () => {
  it("reports the window covered by the configured buckets", () => {
    expect(getTrafficWindowMinutes()).toBe(60);
  });
});
