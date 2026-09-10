import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./prisma.js", () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

vi.mock("../infra/redis.service.js", () => ({
  getRedisClient: vi.fn(),
}));

import { getRedisClient } from "../infra/redis.service.js";

import {
  aggregateDependencyHealth,
  checkDependencies,
  resetDependencyHealthCache,
  toOpsReadyBody,
} from "./dependency-health.js";
import { prisma } from "./prisma.js";

describe("checkDependencies", () => {
  const ping = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    resetDependencyHealthCache();
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ "?column?": 1 }] as never);
    ping.mockResolvedValue("PONG");
    vi.mocked(getRedisClient).mockReturnValue({ ping } as never);
  });

  it("returns ok when postgres and redis answer", async () => {
    const snapshot = await checkDependencies();
    expect(snapshot.status).toBe("ok");
    expect(snapshot.ready).toBe(true);
    expect(snapshot.checks).toEqual([
      expect.objectContaining({
        name: "postgres",
        status: "ok",
        required: true,
      }),
      expect.objectContaining({
        name: "redis",
        status: "ok",
        required: false,
      }),
    ]);
  });

  it("marks postgres error as not ready", async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error("db down"));
    const snapshot = await checkDependencies();
    expect(snapshot.status).toBe("error");
    expect(snapshot.ready).toBe(false);
    expect(snapshot.checks.find((check) => check.name === "postgres")).toEqual(
      expect.objectContaining({
        status: "error",
        required: true,
        error: "db down",
      }),
    );
    expect(snapshot.checks.find((check) => check.name === "redis")?.status).toBe(
      "ok",
    );
  });

  it("treats redis failure as degraded, still ready", async () => {
    ping.mockResolvedValue("NOPE");
    const snapshot = await checkDependencies();
    expect(snapshot.status).toBe("degraded");
    expect(snapshot.ready).toBe(true);
    expect(snapshot.checks.find((check) => check.name === "redis")?.error).toMatch(
      /unexpected ping reply/i,
    );
    expect(toOpsReadyBody(snapshot)).toEqual({ status: "ok" });
  });

  it("times out a hanging redis ping", async () => {
    ping.mockReturnValue(new Promise(() => undefined));
    const snapshot = await checkDependencies({ timeout_ms: 20 });
    expect(snapshot.status).toBe("degraded");
    expect(snapshot.ready).toBe(true);
    expect(snapshot.checks.find((check) => check.name === "redis")?.error).toMatch(
      /timeout/i,
    );
  });

  it("ops ready body is only the traffic-serving bit", async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error("host=postgres"));
    const snapshot = await checkDependencies();
    const body = toOpsReadyBody(snapshot);
    expect(body).toEqual({ status: "error" });
    expect(JSON.stringify(body)).not.toContain("postgres");
    expect(JSON.stringify(body)).not.toContain("host=postgres");
  });

  it("reuses a fresh snapshot instead of probing twice", async () => {
    await checkDependencies();
    await checkDependencies();
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(ping).toHaveBeenCalledTimes(1);
  });

  it("bypasses cache when fresh is set", async () => {
    await checkDependencies();
    await checkDependencies({ fresh: true });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
  });
});

describe("aggregateDependencyHealth", () => {
  it("is error if a required check failed even when optional is ok", () => {
    const snapshot = aggregateDependencyHealth([
      {
        name: "postgres",
        status: "error",
        required: true,
        latency_ms: 1,
      },
      {
        name: "redis",
        status: "ok",
        required: false,
        latency_ms: 1,
      },
    ]);
    expect(snapshot).toEqual(
      expect.objectContaining({ status: "error", ready: false }),
    );
  });
});
