import { getRedisClient } from "../infra/redis.service.js";

import { prisma } from "./prisma.js";

export const DEPENDENCY_PROBE_TIMEOUT_MS = 2000;
/** 避免编排探针与控制台轮询同时打库。Amazon 口径：LB 探针要浅、可缓存。 */
export const DEPENDENCY_PROBE_CACHE_MS = 2000;

export type DependencyName = "postgres" | "redis";
export type DependencyCheckStatus = "ok" | "error";
/** 整体：全好 / 可选依赖挂了仍能接流量 / 关键依赖挂了不能接流量。 */
export type DependencyAggregateStatus = "ok" | "degraded" | "error";

export interface DependencyCheck {
  name: DependencyName;
  status: DependencyCheckStatus;
  required: boolean;
  latency_ms: number;
  error?: string;
}

export interface DependencyHealthSnapshot {
  status: DependencyAggregateStatus;
  ready: boolean;
  checked_at: string;
  checks: DependencyCheck[];
}

const REQUIRED_BY_NAME: Record<DependencyName, boolean> = {
  postgres: true,
  redis: false,
};

let cached:
  | { at: number; timeout_ms: number; snapshot: DependencyHealthSnapshot }
  | null = null;

export function resetDependencyHealthCache(): void {
  cached = null;
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timeout after ${ms}ms`));
    }, ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function checkPostgres(timeoutMs: number): Promise<DependencyCheck> {
  const started = Date.now();
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, timeoutMs, "postgres");
    return {
      name: "postgres",
      status: "ok",
      required: REQUIRED_BY_NAME.postgres,
      latency_ms: Date.now() - started,
    };
  } catch (err) {
    return {
      name: "postgres",
      status: "error",
      required: REQUIRED_BY_NAME.postgres,
      latency_ms: Date.now() - started,
      error: toErrorMessage(err),
    };
  }
}

async function checkRedis(timeoutMs: number): Promise<DependencyCheck> {
  const started = Date.now();
  try {
    const reply = await withTimeout(
      getRedisClient().ping(),
      timeoutMs,
      "redis",
    );
    if (reply !== "PONG") {
      throw new Error(`unexpected ping reply: ${String(reply)}`);
    }
    return {
      name: "redis",
      status: "ok",
      required: REQUIRED_BY_NAME.redis,
      latency_ms: Date.now() - started,
    };
  } catch (err) {
    return {
      name: "redis",
      status: "error",
      required: REQUIRED_BY_NAME.redis,
      latency_ms: Date.now() - started,
      error: toErrorMessage(err),
    };
  }
}

export function aggregateDependencyHealth(
  checks: DependencyCheck[],
  checked_at = new Date().toISOString(),
): DependencyHealthSnapshot {
  const ready = checks
    .filter((check) => check.required)
    .every((check) => check.status === "ok");
  const anyFailed = checks.some((check) => check.status === "error");
  const status: DependencyAggregateStatus = !ready
    ? "error"
    : anyFailed
      ? "degraded"
      : "ok";
  return { status, ready, checked_at, checks };
}

/**
 * 探测 Postgres 与 Redis。
 *
 * Postgres 是接流量的硬依赖；Redis 是缓存/队列，失败只降级，不让实例退出负载。
 * 超时必须就地截断：ioredis 默认会把命令堆进离线队列，连不上时 `ping()` 会一直挂着。
 */
export async function checkDependencies(opts?: {
  timeout_ms?: number;
  fresh?: boolean;
}): Promise<DependencyHealthSnapshot> {
  const timeoutMs = opts?.timeout_ms ?? DEPENDENCY_PROBE_TIMEOUT_MS;
  const now = Date.now();
  if (
    !opts?.fresh &&
    cached &&
    cached.timeout_ms === timeoutMs &&
    now - cached.at < DEPENDENCY_PROBE_CACHE_MS
  ) {
    return cached.snapshot;
  }

  const checks = await Promise.all([
    checkPostgres(timeoutMs),
    checkRedis(timeoutMs),
  ]);
  const snapshot = aggregateDependencyHealth(checks);
  cached = { at: now, timeout_ms: timeoutMs, snapshot };
  return snapshot;
}

export interface OpsReadyBody {
  status: "ok" | "error";
}

/**
 * 编排探针只回答「能不能接流量」。降级（Redis 挂了）仍是 200 / ok。
 * 不带检查名或错误原文：`/ready` 未鉴权。
 */
export function toOpsReadyBody(
  snapshot: DependencyHealthSnapshot,
): OpsReadyBody {
  return { status: snapshot.ready ? "ok" : "error" };
}
