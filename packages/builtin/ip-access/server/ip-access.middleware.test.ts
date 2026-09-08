/**
 * 判定钩子的端到端测试：起一个真的 Fastify，发真的 HTTP 请求。
 *
 * 单测判定函数已经覆盖了优先级；这里要验的是那些只有装到框架上才成立的性质——
 * 拿到的 IP 是不是可信的那个、`/health` 会不会被自己拦掉、名单挂了会不会全站 403。
 */
import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockMatchRules, mockRecordRuleHits, mockResolveHostTenant } = vi.hoisted(
  () => ({
    mockMatchRules: vi.fn(),
    mockRecordRuleHits: vi.fn(),
    mockResolveHostTenant: vi.fn(),
  }),
);

const ipAccessConfig = {
  enabled: true,
  refreshIntervalMs: 15_000,
  alwaysAllow: [] as string[],
  autoBanMinutes: 60,
  loginFailureThreshold: 10,
  loginFailureWindowMinutes: 15,
  nginxExportPath: "",
};

vi.mock("@rewindom/server-kernel/lib/config.js", () => ({
  config: {
    server: { logLevel: "silent", isProduction: false, isTest: true },
    get ipAccess() {
      return ipAccessConfig;
    },
  },
}));

vi.mock("./ip-access.cache.js", () => ({ matchRules: mockMatchRules }));
vi.mock("./ip-access.service.js", () => ({
  recordRuleHits: mockRecordRuleHits,
}));
vi.mock("@rewindom/server-kernel/lib/host-tenant.js", async () => {
  const actual = await vi.importActual<
    typeof import("@rewindom/server-kernel/lib/host-tenant.js")
  >("@rewindom/server-kernel/lib/host-tenant.js");
  return { ...actual, resolveHostTenant: mockResolveHostTenant };
});

const { ipAccessMiddleware } = await import("./ip-access.middleware.js");

function blockRule() {
  return {
    id: "r1",
    cidr: "9.9.9.9/32",
    action: "block" as const,
    mode: "enforce" as const,
    scope: "platform" as const,
  };
}

async function buildApp(trustProxy: boolean | string): Promise<FastifyInstance> {
  const app = Fastify({ logger: false, trustProxy });
  await ipAccessMiddleware(app);
  app.get("/health", async () => ({ status: "ok" }));
  app.get("/api/thing", async () => ({ ok: true }));
  app.get("/", async () => ({ ssr: true }));
  await app.ready();
  return app;
}

let app: FastifyInstance | null = null;

beforeEach(() => {
  vi.clearAllMocks();
  ipAccessConfig.enabled = true;
  mockResolveHostTenant.mockResolvedValue(null);
  mockMatchRules.mockResolvedValue({ matched: [], exempt: false });
});

afterEach(async () => {
  await app?.close();
  app = null;
});

describe("ipAccessMiddleware", () => {
  it("blocks a matching IP with a bare 403", async () => {
    mockMatchRules.mockResolvedValue({ matched: [blockRule()], exempt: false });
    app = await buildApp(true);

    const res = await app.inject({ method: "GET", url: "/api/thing" });
    expect(res.statusCode).toBe(403);
    // 不回显命中了哪条规则 / 对方 IP / 何时解封——那些只会帮对方调试绕过方式
    expect(res.body).not.toContain("9.9.9.9");
    expect(res.body).not.toContain("r1");
  });

  it("also covers SSR paths, not just /api", async () => {
    // 官网 SSR 走同一个 Fastify；只拦 API 等于把站点正门敞着
    mockMatchRules.mockResolvedValue({ matched: [blockRule()], exempt: false });
    app = await buildApp(true);

    expect((await app.inject({ method: "GET", url: "/" })).statusCode).toBe(403);
  });

  it("never blocks /health", async () => {
    // 容器编排靠它判存活，拦下来会引发滚动重启
    mockMatchRules.mockResolvedValue({ matched: [blockRule()], exempt: false });
    app = await buildApp(true);

    expect((await app.inject({ method: "GET", url: "/health" })).statusCode).toBe(
      200,
    );
    expect(mockMatchRules).not.toHaveBeenCalled();
  });

  it("never blocks a CORS preflight", async () => {
    mockMatchRules.mockResolvedValue({ matched: [blockRule()], exempt: false });
    app = await buildApp(true);

    const res = await app.inject({ method: "OPTIONS", url: "/api/thing" });
    expect(res.statusCode).not.toBe(403);
    expect(mockMatchRules).not.toHaveBeenCalled();
  });

  describe("trusted proxy", () => {
    it("judges the spoofed XFF when the socket peer itself is trusted", async () => {
      // trustProxy: true 采信客户端自带的 XFF —— 这正是阶段 0 要消灭的配置，
      // 这条用例把那个行为钉住，免得有人「顺手」改回去
      mockMatchRules.mockResolvedValue({
        matched: [blockRule()],
        exempt: false,
      });
      app = await buildApp(true);

      const res = await app.inject({
        method: "GET",
        url: "/api/thing",
        headers: { "x-forwarded-for": "9.9.9.9" },
      });
      expect(res.statusCode).toBe(403);
      expect(mockMatchRules).toHaveBeenCalledWith("9.9.9.9", null);
    });

    it("ignores a forged XFF when the peer is not a trusted proxy", async () => {
      // 只信任 10.0.0.0/8 时，来自回环的请求自报 9.9.9.9 不算数
      app = await buildApp("10.0.0.0/8");

      await app.inject({
        method: "GET",
        url: "/api/thing",
        headers: { "x-forwarded-for": "9.9.9.9" },
      });
      const [ip] = mockMatchRules.mock.calls[0] ?? [];
      expect(ip).not.toBe("9.9.9.9");
    });
  });

  it("passes the resolved tenant so site-level rules can apply", async () => {
    mockResolveHostTenant.mockResolvedValue({
      tenant_id: "t1",
      tenant_slug: "acme",
    });
    app = await buildApp(true);

    await app.inject({
      method: "GET",
      url: "/api/thing",
      headers: { host: "acme.example.com" },
    });
    expect(mockMatchRules).toHaveBeenCalledWith(expect.any(String), "t1");
  });

  it("counts hits for every matched rule, log_only included", async () => {
    mockMatchRules.mockResolvedValue({
      matched: [{ ...blockRule(), mode: "log_only" as const }],
      exempt: false,
    });
    app = await buildApp(true);

    await app.inject({ method: "GET", url: "/api/thing" });
    expect(mockRecordRuleHits).toHaveBeenCalledWith(["r1"]);
  });

  it("does not enforce a log_only rule", async () => {
    mockMatchRules.mockResolvedValue({
      matched: [{ ...blockRule(), mode: "log_only" as const }],
      exempt: false,
    });
    app = await buildApp(true);

    expect(
      (await app.inject({ method: "GET", url: "/api/thing" })).statusCode,
    ).toBe(200);
  });

  it("lets an exempt IP through even with a catch-all block", async () => {
    mockMatchRules.mockResolvedValue({
      matched: [{ ...blockRule(), cidr: "0.0.0.0/0" }],
      exempt: true,
    });
    app = await buildApp(true);

    expect(
      (await app.inject({ method: "GET", url: "/api/thing" })).statusCode,
    ).toBe(200);
  });

  it("registers no hook at all when disabled", async () => {
    ipAccessConfig.enabled = false;
    mockMatchRules.mockResolvedValue({ matched: [blockRule()], exempt: false });
    app = await buildApp(true);

    expect(
      (await app.inject({ method: "GET", url: "/api/thing" })).statusCode,
    ).toBe(200);
    expect(mockMatchRules).not.toHaveBeenCalled();
  });
});
