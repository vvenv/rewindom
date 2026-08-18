import { config } from "@rewindom/server-kernel/lib/config.js";
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";

import type { SlowRequestLogItem, SlowRequestStats } from "../shared/index.js";
import type { RequestTimingSample } from "@rewindom/server-kernel/middleware/request-timing.middleware.js";

interface PendingEntry {
  duration_ms: number;
  status_code: number;
  route: string;
  path: string | null;
  method: string;
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
  }, config.observability.slowRequest.flushIntervalMs);
}

async function flush(): Promise<void> {
  const batch = buffer.slice();
  resetBuffer();
  if (batch.length === 0) return;

  try {
    await prisma.slowRequestLog.createMany({
      data: batch,
      skipDuplicates: true,
    });
  } catch (err) {
    console.warn("[slow-request] flush failed", err);
  }
}

function buildDateFilter(
  startDate?: string,
  endDate?: string,
): Record<string, Date> | undefined {
  if (startDate === undefined && endDate === undefined) return undefined;
  const createdFilter: Record<string, Date> = {};
  if (startDate) createdFilter.gte = new Date(startDate);
  if (endDate) createdFilter.lte = new Date(endDate);
  return createdFilter;
}

function buildWhere(filters: {
  route?: string;
  method?: string;
  min_duration_ms?: number;
  status_code?: number;
  tenant_slug?: string;
  start_date?: string;
  end_date?: string;
}): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  if (filters.route !== undefined) where.route = { contains: filters.route };
  if (filters.method !== undefined) where.method = filters.method;
  if (filters.min_duration_ms !== undefined) {
    where.duration_ms = { gte: filters.min_duration_ms };
  }
  if (filters.status_code !== undefined) {
    where.status_code = filters.status_code;
  }
  if (filters.tenant_slug !== undefined) where.tenant_slug = filters.tenant_slug;
  const createdAt = buildDateFilter(filters.start_date, filters.end_date);
  if (createdAt) where.created_at = createdAt;
  return where;
}

const SORTABLE_FIELDS = new Set([
  "created_at",
  "duration_ms",
  "route",
  "method",
  "status_code",
  "tenant_slug",
]);

export const SlowRequestService = {
  enqueue(sample: RequestTimingSample): void {
    if (!config.observability.slowRequest.enabled) return;
    if (sample.duration_ms < config.observability.slowRequest.thresholdMs) {
      return;
    }

    buffer.push({
      duration_ms: sample.duration_ms,
      status_code: sample.status_code,
      route: sample.route,
      path: sample.path,
      method: sample.method,
      tenant_slug: sample.tenant_slug,
      user_id: sample.user_id,
      username: sample.username,
      request_id: sample.request_id,
      source: sample.source,
    });

    if (buffer.length >= config.observability.slowRequest.bufferSize) {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      void flush();
    } else {
      scheduleFlush();
    }
  },

  async flushNow(): Promise<void> {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    await flush();
  },

  async getSlowRequestLogs(filters: {
    route?: string;
    method?: string;
    min_duration_ms?: number;
    status_code?: number;
    tenant_slug?: string;
    start_date?: string;
    end_date?: string;
    skip: number;
    take: number;
    sort_by?: string;
    sort_dir?: "asc" | "desc";
  }): Promise<SlowRequestLogItem[]> {
    const sortField =
      filters.sort_by && SORTABLE_FIELDS.has(filters.sort_by)
        ? filters.sort_by
        : "created_at";
    const sortDir = filters.sort_dir ?? "desc";

    const rows = await prisma.slowRequestLog.findMany({
      where: buildWhere(filters) as never,
      orderBy: { [sortField]: sortDir },
      skip: filters.skip,
      take: filters.take,
    });

    return rows.map((row) => ({
      ...row,
      created_at: row.created_at.toISOString(),
    }));
  },

  async getSlowRequestLogsCount(filters: {
    route?: string;
    method?: string;
    min_duration_ms?: number;
    status_code?: number;
    tenant_slug?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<number> {
    return prisma.slowRequestLog.count({
      where: buildWhere(filters) as never,
    });
  },

  async getSlowRequestStats(filters: {
    start_date?: string;
    end_date?: string;
    tenant_slug?: string;
  }): Promise<SlowRequestStats> {
    const where = buildWhere(filters);

    const [total_count, allRows, byRoute] = await Promise.all([
      prisma.slowRequestLog.count({ where: where as never }),
      prisma.slowRequestLog.findMany({
        where: where as never,
        orderBy: { duration_ms: "desc" },
        take: 1000,
        select: { duration_ms: true },
      }),
      prisma.slowRequestLog.groupBy({
        by: ["route", "method"],
        where: where as never,
        _count: { id: true },
        _avg: { duration_ms: true },
        _max: { duration_ms: true },
        orderBy: { _avg: { duration_ms: "desc" as const } },
        take: 20,
      }),
    ]);

    const durations = allRows
      .map((row) => row.duration_ms)
      .sort((a, b) => a - b);
    const avg_duration_ms =
      durations.length > 0
        ? Math.round(
            durations.reduce((sum, val) => sum + val, 0) / durations.length,
          )
        : 0;
    const p95Index = Math.ceil(durations.length * 0.95) - 1;
    const p95_duration_ms = p95Index >= 0 ? durations[p95Index]! : 0;
    const duration_max =
      durations.length > 0 ? durations[durations.length - 1]! : 0;

    return {
      total_count,
      avg_duration_ms,
      p95_duration_ms,
      duration_max,
      by_route: byRoute.map((row) => ({
        route: row.route,
        method: row.method,
        count: row._count.id,
        avg_duration_ms: Math.round(row._avg.duration_ms ?? 0),
        max_duration_ms: row._max.duration_ms ?? 0,
      })),
    };
  },

  async cleanupOldLogs(days: number, tenantSlug?: string): Promise<number> {
    const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await prisma.slowRequestLog.deleteMany({
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
