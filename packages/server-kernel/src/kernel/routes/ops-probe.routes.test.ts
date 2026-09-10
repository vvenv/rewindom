import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/dependency-health.js", async (importOriginal) => {
  const actual = await importOriginal<typeof DependencyHealthModule>();
  return {
    ...actual,
    checkDependencies: vi.fn(),
  };
});

import { checkDependencies } from "../../lib/dependency-health.js";

import { registerOpsProbeRoutes } from "./ops-probe.routes.js";

// 类型导入会被擦除，不会与被 hoist 的 vi.mock 抢加载顺序；
// 写成 `typeof import(...)` 则会踩 consistent-type-imports 规则。
import type * as DependencyHealthModule from "../../lib/dependency-health.js";

describe("ops probe routes", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify({ logger: false });
    await registerOpsProbeRoutes(app);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it("GET /health is a cheap liveness probe", async () => {
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
    expect(checkDependencies).not.toHaveBeenCalled();
  });

  it("GET /ready returns 200 when the instance can serve traffic", async () => {
    vi.mocked(checkDependencies).mockResolvedValueOnce({
      status: "ok",
      ready: true,
      checked_at: "2026-09-09T00:00:00.000Z",
      checks: [
        { name: "postgres", status: "ok", required: true, latency_ms: 2 },
        { name: "redis", status: "ok", required: false, latency_ms: 1 },
      ],
    });

    const response = await app.inject({ method: "GET", url: "/ready" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });

  it("GET /ready stays 200 when only redis is down", async () => {
    vi.mocked(checkDependencies).mockResolvedValueOnce({
      status: "degraded",
      ready: true,
      checked_at: "2026-09-09T00:00:00.000Z",
      checks: [
        { name: "postgres", status: "ok", required: true, latency_ms: 2 },
        {
          name: "redis",
          status: "error",
          required: false,
          latency_ms: 2000,
          error: "redis://internal:6379",
        },
      ],
    });

    const response = await app.inject({ method: "GET", url: "/ready" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
    expect(response.body).not.toContain("redis");
  });

  it("GET /ready returns 503 only when a required dependency is down", async () => {
    vi.mocked(checkDependencies).mockResolvedValueOnce({
      status: "error",
      ready: false,
      checked_at: "2026-09-09T00:00:00.000Z",
      checks: [
        {
          name: "postgres",
          status: "error",
          required: true,
          latency_ms: 2000,
          error: "host=postgres",
        },
        { name: "redis", status: "ok", required: false, latency_ms: 1 },
      ],
    });

    const response = await app.inject({ method: "GET", url: "/ready" });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ status: "error" });
    expect(response.body).not.toContain("postgres");
    expect(response.body).not.toContain("host=postgres");
  });
});
