import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPipeline, pipelineExec } = vi.hoisted(() => {
  const exec = vi.fn();
  const chain = {
    incr: () => chain,
    expire: () => chain,
    exec,
  };
  return { mockPipeline: vi.fn(() => chain), pipelineExec: exec };
});

const ipAccessConfig = {
  rateLimitEnabled: true,
  rateLimitMode: "log_only",
  rateLimitAuthPerMinute: 20,
  rateLimitPublicPerMinute: 30,
  rateLimitDefaultPerMinute: 600,
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
  getRedisClient: () => ({ pipeline: mockPipeline }),
}));

const { consumeRateLimit, resolveRateLimitTier } = await import(
  "./rate-limit.service.js"
);

/** 让 INCR 返回指定的窗口内计数 */
function countIs(n: number): void {
  pipelineExec.mockResolvedValue([
    [null, n],
    [null, 1],
  ]);
}

beforeEach(() => {
  vi.clearAllMocks();
  ipAccessConfig.rateLimitEnabled = true;
  ipAccessConfig.rateLimitAuthPerMinute = 20;
  ipAccessConfig.rateLimitPublicPerMinute = 30;
  ipAccessConfig.rateLimitDefaultPerMinute = 600;
  countIs(1);
});

describe("resolveRateLimitTier", () => {
  it("puts every auth path in the strictest tier", () => {
    // 逐个列精确路由会漏掉注册 / 改密 / OAuth 回调
    for (const path of [
      "/api/auth/login",
      "/api/auth/register",
      "/api/auth/oauth/github/callback",
      "/api/member/oauth/google",
      "/api/site-members/login",
    ]) {
      expect(resolveRateLimitTier("POST", path)).toBe("auth");
    }
  });

  it("treats anonymous writes to public endpoints as the public tier", () => {
    expect(resolveRateLimitTier("POST", "/api/public/site-form/submit")).toBe(
      "public",
    );
  });

  it("does not tighten public reads — that is normal site browsing", () => {
    expect(resolveRateLimitTier("GET", "/api/public/docs")).toBe("default");
    expect(resolveRateLimitTier("HEAD", "/api/public/docs")).toBe("default");
  });

  it("falls back to the default tier", () => {
    expect(resolveRateLimitTier("GET", "/api/notes")).toBe("default");
    expect(resolveRateLimitTier("GET", "/")).toBe("default");
  });
});

describe("consumeRateLimit", () => {
  const req = { ip: "203.0.113.9", method: "POST", path: "/api/auth/login" };

  it("reports the tier limit alongside the count", async () => {
    countIs(5);
    await expect(consumeRateLimit(req)).resolves.toMatchObject({
      tier: "auth",
      count: 5,
      limit: 20,
      exceeded: false,
    });
  });

  it("does not flag the request that exactly reaches the limit", async () => {
    countIs(20);
    expect((await consumeRateLimit(req))?.exceeded).toBe(false);
  });

  it("flags the first request past the limit", async () => {
    countIs(21);
    expect((await consumeRateLimit(req))?.exceeded).toBe(true);
  });

  it("applies the default tier's much looser limit to ordinary traffic", async () => {
    // 共享出口后面可能有几十个真实用户，这一档定严了先挡住的是他们
    countIs(100);
    const decision = await consumeRateLimit({
      ip: "203.0.113.9",
      method: "GET",
      path: "/api/notes",
    });
    expect(decision?.limit).toBe(600);
    expect(decision?.exceeded).toBe(false);
  });

  it("suggests a Retry-After within the window", async () => {
    countIs(21);
    const decision = await consumeRateLimit(req);
    expect(decision?.retryAfterSeconds).toBeGreaterThan(0);
    expect(decision?.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("treats a limit of 0 as unlimited for that tier", async () => {
    ipAccessConfig.rateLimitAuthPerMinute = 0;
    await expect(consumeRateLimit(req)).resolves.toBeNull();
    expect(mockPipeline).not.toHaveBeenCalled();
  });

  it("does nothing when rate limiting is off", async () => {
    ipAccessConfig.rateLimitEnabled = false;
    await expect(consumeRateLimit(req)).resolves.toBeNull();
    expect(mockPipeline).not.toHaveBeenCalled();
  });

  it("keys separately per tier so one does not consume another's budget", async () => {
    countIs(1);
    await consumeRateLimit(req);
    await consumeRateLimit({ ...req, path: "/api/notes" });
    // pipeline 被调用两次，key 前缀不同（tier 在 key 里）
    expect(mockPipeline).toHaveBeenCalledTimes(2);
  });

  describe("fail-open", () => {
    it("allows the request when Redis throws", async () => {
      // 限流是防滥用的，不是防故障的；因为 Redis 抖动把全站拒了更严重
      mockPipeline.mockImplementationOnce(() => {
        throw new Error("redis down");
      });
      await expect(consumeRateLimit(req)).resolves.toBeNull();
    });

    it("allows the request when the pipeline returns nothing usable", async () => {
      pipelineExec.mockResolvedValue(null);
      await expect(consumeRateLimit(req)).resolves.toBeNull();
    });
  });
});
