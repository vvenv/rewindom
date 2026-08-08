import { config } from "@be-water/server-kernel/lib/config.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import {
  getRequestContext,
  type RequestContext,
} from "@be-water/server-kernel/lib/request-context.js";

import { fingerprintSql } from "./sql-fingerprint.js";

import type { SlowQueryLogItem, SlowQueryStats } from "../shared/index.js";

// ─── Buffer ──────────────────────────────────────────────

interface PendingEntry {
  duration_ms: number;
  query: string;
  params: string | null;
  fingerprint: string;
  target: string | null;
  route: string | null;
  method: string | null;
  tenant_slug: string | null;
  user_id: string | null;
  username: string | null;
  request_id: string | null;
  source: string;
}

let buffer: PendingEntry[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function resetBuffer(): void {
  buffer = [];
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, config.observability.slowQuery.flushIntervalMs);
}

async function flush(): Promise<void> {
  const batch = buffer.slice();
  resetBuffer();
  if (batch.length === 0) return;

  try {
    await prisma.slowQueryLog.createMany({
      data: batch,
      skipDuplicates: true,
    });
  } catch (err) {
    // 写入失败不阻塞业务，只打日志
    console.warn("[slow-query] flush failed", err);
  }
}

// ─── Exclude rules ────────────────────────────────────────

const EXCLUDED_QUERY_PATTERNS = [
  /^INSERT INTO\s+"SlowQueryLog"/i,
  /^SELECT\s+1/i,
  /^(BEGIN|COMMIT|ROLLBACK|DEALLOCATE|DISCARD)/i,
  /prisma_migrations/i,
];

function isExcludedQuery(query: string): boolean {
  return EXCLUDED_QUERY_PATTERNS.some((pattern) => pattern.test(query.trim()));
}

function truncateParams(params: string, maxLen: number): string {
  if (params.length <= maxLen) return params;
  return params.slice(0, maxLen) + "...";
}

function pickContext(ctx: RequestContext | null): {
  route: string | null;
  method: string | null;
  tenant_slug: string | null;
  user_id: string | null;
  username: string | null;
  request_id: string | null;
  source: string;
} {
  if (!ctx) {
    return {
      route: null,
      method: null,
      tenant_slug: null,
      user_id: null,
      username: null,
      request_id: null,
      source: "unknown",
    };
  }
  return {
    route: ctx.route,
    method: ctx.method,
    tenant_slug: ctx.tenant_slug,
    user_id: ctx.user_id,
    username: ctx.username,
    request_id: ctx.request_id,
    source: ctx.source,
  };
}

// ─── Public API ───────────────────────────────────────────

export const SlowQueryService = {
  /**
   * 由 Prisma query 事件监听器调用，入队待写
   */
  enqueue(
    durationMs: number,
    query: string,
    params: string,
    target: string | undefined,
  ): void {
    if (!config.observability.slowQuery.enabled) return;
    if (durationMs < config.observability.slowQuery.thresholdMs) return;
    if (isExcludedQuery(query)) return;

    const ctx = getRequestContext();
    const entry: PendingEntry = {
      duration_ms: durationMs,
      query,
      params: params
        ? truncateParams(params, config.observability.slowQuery.paramsMaxLen)
        : null,
      fingerprint: fingerprintSql(query),
      target: target ?? null,
      ...pickContext(ctx),
    };

    buffer.push(entry);

    if (buffer.length >= config.observability.slowQuery.bufferSize) {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      void flush();
    } else {
      scheduleFlush();
    }
  },

  /**
   * 强制刷新缓冲区（用于进程关闭前）
   */
  async flushNow(): Promise<void> {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    await flush();
  },

  // ─── Query ──────────────────────────────────────────────

  async getSlowQueryLogs(filters: {
    route?: string;
    fingerprint?: string;
    min_duration_ms?: number;
    source?: string;
    tenant_slug?: string;
    start_date?: string;
    end_date?: string;
    skip: number;
    take: number;
    sort_by?: string;
    sort_order?: "asc" | "desc";
  }): Promise<SlowQueryLogItem[]> {
    const where: Record<string, unknown> = {};
    if (filters.route !== undefined) where.route = { contains: filters.route };
    if (filters.fingerprint !== undefined)
      where.fingerprint = filters.fingerprint;
    if (filters.min_duration_ms !== undefined)
      where.duration_ms = { gte: filters.min_duration_ms };
    if (filters.source !== undefined) where.source = filters.source;
    if (filters.tenant_slug !== undefined)
      where.tenant_slug = filters.tenant_slug;
    if (filters.start_date !== undefined || filters.end_date !== undefined) {
      const createdFilter: Record<string, Date> = {};
      if (filters.start_date) {
        createdFilter.gte = new Date(filters.start_date);
      }
      if (filters.end_date) {
        createdFilter.lte = new Date(filters.end_date);
      }
      where.created_at = createdFilter;
    }

    const SORTABLE_FIELDS = new Set([
      "created_at",
      "duration_ms",
      "route",
      "tenant_slug",
      "source",
    ]);
    const sortField =
      filters.sort_by && SORTABLE_FIELDS.has(filters.sort_by)
        ? filters.sort_by
        : "created_at";
    const sortOrder = filters.sort_order ?? "desc";

    const rows = await prisma.slowQueryLog.findMany({
      where: where as never,
      orderBy: { [sortField]: sortOrder },
      skip: filters.skip,
      take: filters.take,
    });

    return rows.map(
      (row: {
        id: string;
        duration_ms: number;
        query: string;
        params: string | null;
        fingerprint: string;
        target: string | null;
        route: string | null;
        method: string | null;
        tenant_slug: string | null;
        user_id: string | null;
        username: string | null;
        request_id: string | null;
        source: string;
        created_at: Date;
      }) => ({
        ...row,
        created_at: row.created_at.toISOString(),
      }),
    );
  },

  async getSlowQueryLogsCount(filters: {
    route?: string;
    fingerprint?: string;
    min_duration_ms?: number;
    source?: string;
    tenant_slug?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<number> {
    const where: Record<string, unknown> = {};
    if (filters.route !== undefined) where.route = { contains: filters.route };
    if (filters.fingerprint !== undefined)
      where.fingerprint = filters.fingerprint;
    if (filters.min_duration_ms !== undefined)
      where.duration_ms = { gte: filters.min_duration_ms };
    if (filters.source !== undefined) where.source = filters.source;
    if (filters.tenant_slug !== undefined)
      where.tenant_slug = filters.tenant_slug;
    if (filters.start_date !== undefined || filters.end_date !== undefined) {
      const createdFilter: Record<string, Date> = {};
      if (filters.start_date) {
        createdFilter.gte = new Date(filters.start_date);
      }
      if (filters.end_date) {
        createdFilter.lte = new Date(filters.end_date);
      }
      where.created_at = createdFilter;
    }

    return prisma.slowQueryLog.count({ where: where as never });
  },

  async getSlowQueryStats(filters: {
    start_date?: string;
    end_date?: string;
    tenant_slug?: string;
  }): Promise<SlowQueryStats> {
    const where: Record<string, unknown> = {};
    if (filters.tenant_slug !== undefined)
      where.tenant_slug = filters.tenant_slug;
    if (filters.start_date !== undefined || filters.end_date !== undefined) {
      const createdFilter: Record<string, Date> = {};
      if (filters.start_date) {
        createdFilter.gte = new Date(filters.start_date);
      }
      if (filters.end_date) {
        createdFilter.lte = new Date(filters.end_date);
      }
      where.created_at = createdFilter;
    }

    const [total_count, allRows, byRoute, byFingerprint] = await Promise.all([
      prisma.slowQueryLog.count({ where: where as never }),
      prisma.slowQueryLog.findMany({
        where: where as never,
        orderBy: { duration_ms: "desc" },
        take: 1000,
        select: { duration_ms: true },
      }),
      prisma.slowQueryLog.groupBy({
        by: ["route"],
        where: where as never,
        _count: { id: true },
        _avg: { duration_ms: true },
        orderBy: { _avg: { duration_ms: "desc" as const } },
        take: 20,
      }),
      prisma.slowQueryLog.groupBy({
        by: ["fingerprint"],
        where: where as never,
        _count: { id: true },
        _max: { duration_ms: true },
        _avg: { duration_ms: true },
        orderBy: { _max: { duration_ms: "desc" as const } },
        take: 20,
      }),
    ]);

    const durations: number[] = allRows
      .map((r: { duration_ms: number }) => r.duration_ms)
      .sort((a: number, b: number) => a - b);
    const avg_duration_ms =
      durations.length > 0
        ? Math.round(
            durations.reduce((sum: number, val: number) => sum + val, 0) /
              durations.length,
          )
        : 0;

    // P95: 第 95 百分位数
    const p95Index = Math.ceil(durations.length * 0.95) - 1;
    const p95_duration_ms = p95Index >= 0 ? durations[p95Index] : 0;
    const duration_max =
      durations.length > 0 ? durations[durations.length - 1] : 0;

    return {
      total_count,
      avg_duration_ms,
      p95_duration_ms,
      duration_max,
      by_route: byRoute.map(
        (r: {
          route: string | null;
          _count: { id: number };
          _avg: { duration_ms: number | null };
        }) => ({
          route: r.route ?? "(unknown)",
          count: r._count.id,
          avg_duration_ms: Math.round(r._avg.duration_ms ?? 0),
        }),
      ),
      by_fingerprint: byFingerprint.map(
        (r: {
          fingerprint: string;
          _count: { id: number };
          _max: { duration_ms: number | null };
          _avg: { duration_ms: number | null };
        }) => ({
          fingerprint: r.fingerprint,
          count: r._count.id,
          max_duration_ms: r._max.duration_ms ?? 0,
          avg_duration_ms: Math.round(r._avg.duration_ms ?? 0),
        }),
      ),
    };
  },

  async cleanupOldLogs(days: number, tenantSlug?: string): Promise<number> {
    const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await prisma.slowQueryLog.deleteMany({
      where: {
        AND: [
          { created_at: { lt: threshold } },
          ...(tenantSlug ? [{ tenant_slug: tenantSlug }] : []),
        ],
      },
    });
    return result.count;
  },
};
