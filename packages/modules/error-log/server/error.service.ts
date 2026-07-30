import { Prisma } from "@be-water/server-kernel/generated/prisma/client/client.js";
import { resolveSortField, resolveSortOrder } from "@be-water/server-kernel/http/list-sort.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { DEFAULT_TENANT_SLUG, type JsonValue } from "@be-water/shared";

import { type ErrorStats } from "../shared/index.js";


export interface ErrorLogInput {
  level: "error" | "warn" | "info" | "debug";
  message: string;
  stackTrace?: string;
  userId?: string;
  username?: string;
  tenantSlug?: string | null;
  route?: string;
  method?: string;
  ipAddress?: string;
  userAgent?: string;
  /** 以下四项存进 jsonb 列，调用方传纯 JSON 值而不是 JSON.stringify 后的字符串 */
  requestBody?: unknown;
  requestParams?: unknown;
  requestQuery?: unknown;
  errorCode?: string;
  context?: Record<string, unknown>;
}

/** `undefined` -> 不写该字段（列保持 NULL）；`null` -> 写 JSON null；其余原样交给 jsonb。 */
function toJsonColumn(
  value: unknown,
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

interface ErrorLogFilters {
  level?: string;
  userId?: string;
  q?: string;
  tenantSlug?: string;
  startDate?: string;
  endDate?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}

/**
 * `getErrorLogs` 的 select 投影行。
 *
 * 具名导出而非就地内联：测试要构造同形状的 mock，各抄一份必然漂移
 * （`tenant_slug` 加进来时就漏了五处）。
 */
export interface ErrorLogRow {
  id: string;
  level: string;
  message: string;
  stack_trace: string | null;
  user_id: string | null;
  username: string | null;
  tenant_slug: string | null;
  route: string | null;
  method: string | null;
  ip_address: string | null;
  user_agent: string | null;
  request_body: JsonValue | null;
  request_params: JsonValue | null;
  request_query: JsonValue | null;
  error_code: string | null;
  context: JsonValue | null;
  created_at: Date;
}

const ERROR_LOG_SORTABLE_FIELDS = new Set([
  "created_at",
  "level",
  "tenant_slug",
  "username",
  "route",
  "method",
  "error_code",
]);

/**
 * Error log service for tracking application errors and issues
 */
export class ErrorService {
  /**
   * Create an error log entry
   */
  static async log(input: ErrorLogInput): Promise<void> {
    const {
      level,
      message,
      stackTrace,
      userId,
      username,
      tenantSlug,
      route,
      method,
      ipAddress,
      userAgent,
      requestBody,
      requestParams,
      requestQuery,
      errorCode,
      context,
    } = input;

    await prisma.errorLog.create({
      data: {
        level,
        message,
        stack_trace: stackTrace,
        user_id: userId,
        username,
        ...(tenantSlug ? { tenant_slug: tenantSlug } : {}),
        route,
        method,
        ip_address: ipAddress,
        user_agent: userAgent,
        request_body: toJsonColumn(requestBody),
        request_params: toJsonColumn(requestParams),
        request_query: toJsonColumn(requestQuery),
        error_code: errorCode,
        context: toJsonColumn(context),
      },
    });
  }

  static belongsToTenant(
    log: { tenant_slug: string | null },
    tenantSlug: string,
  ): boolean {
    if (tenantSlug === DEFAULT_TENANT_SLUG) {
      return log.tenant_slug === tenantSlug || log.tenant_slug === null;
    }
    return log.tenant_slug === tenantSlug;
  }

  private static buildTenantSlugWhere(
    tenantSlug: string,
  ): Record<string, unknown> {
    if (tenantSlug === DEFAULT_TENANT_SLUG) {
      return {
        OR: [{ tenant_slug: tenantSlug }, { tenant_slug: null }],
      };
    }
    return { tenant_slug: tenantSlug };
  }

  private static buildTextSearchWhere(
    q: string,
  ): Record<string, unknown> {
    return {
      OR: [
        { username: { contains: q, mode: "insensitive" as const } },
        { route: { contains: q, mode: "insensitive" as const } },
        { error_code: { contains: q, mode: "insensitive" as const } },
      ],
    };
  }

  private static buildErrorLogConditions(
    filters: ErrorLogFilters,
  ): Record<string, unknown>[] {
    const { level, userId, q, startDate, endDate } = filters;
    const conditions: Record<string, unknown>[] = [];

    if (level) {
      conditions.push({ level });
    }

    if (userId) {
      conditions.push({ user_id: userId });
    }

    if (q) {
      conditions.push(this.buildTextSearchWhere(q));
    }

    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) {
        dateFilter.gte = new Date(
          startDate.includes(" ") ? startDate : startDate + "T00:00:00.000Z",
        );
      }
      if (endDate) {
        dateFilter.lte = new Date(
          endDate.includes(" ") ? endDate : endDate + "T23:59:59.999Z",
        );
      }
      conditions.push({ created_at: dateFilter });
    }

    return conditions;
  }

  /**
   * Log an error with full context
   */
  static async logError(
    error: Error,
    context?: {
      userId?: string;
      username?: string;
      tenantSlug?: string | null;
      route?: string;
      method?: string;
      ipAddress?: string;
      userAgent?: string;
      requestBody?: unknown;
      requestParams?: unknown;
      requestQuery?: unknown;
      errorCode?: string;
      additionalContext?: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.log({
      level: "error",
      message: error.message,
      stackTrace: error.stack,
      userId: context?.userId,
      username: context?.username,
      tenantSlug: context?.tenantSlug,
      route: context?.route,
      method: context?.method,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestBody: context?.requestBody,
      requestParams: context?.requestParams,
      requestQuery: context?.requestQuery,
      errorCode: context?.errorCode,
      context: context?.additionalContext,
    });
  }

  /**
   * Log a warning
   */
  static async logWarning(
    message: string,
    context?: {
      userId?: string;
      username?: string;
      tenantSlug?: string | null;
      route?: string;
      method?: string;
      ipAddress?: string;
      userAgent?: string;
      additionalContext?: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.log({
      level: "warn",
      message,
      userId: context?.userId,
      username: context?.username,
      tenantSlug: context?.tenantSlug,
      route: context?.route,
      method: context?.method,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      context: context?.additionalContext,
    });
  }

  /**
   * Log an info message
   */
  static async logInfo(
    message: string,
    context?: {
      userId?: string;
      username?: string;
      tenantSlug?: string | null;
      route?: string;
      method?: string;
      additionalContext?: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.log({
      level: "info",
      message,
      userId: context?.userId,
      username: context?.username,
      tenantSlug: context?.tenantSlug,
      route: context?.route,
      method: context?.method,
      context: context?.additionalContext,
    });
  }

  /**
   * Log a debug message
   */
  static async logDebug(
    message: string,
    context?: {
      userId?: string;
      username?: string;
      tenantSlug?: string | null;
      route?: string;
      method?: string;
      additionalContext?: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.log({
      level: "debug",
      message,
      userId: context?.userId,
      username: context?.username,
      tenantSlug: context?.tenantSlug,
      route: context?.route,
      method: context?.method,
      context: context?.additionalContext,
    });
  }

  /**
   * Get error logs with filters
   */
  static async getErrorLogs(
    filters: ErrorLogFilters & {
      skip?: number;
      take?: number;
    } = {},
  ): Promise<ErrorLogRow[]> {
    const {
      skip = 0,
      take = 20,
      sort_by,
      sort_dir,
      tenantSlug,
      ...whereFilters
    } = filters;
    const sortField = resolveSortField(
      sort_by,
      ERROR_LOG_SORTABLE_FIELDS,
      "created_at",
    );
    const sortOrder = resolveSortOrder(sort_dir, "desc");

    const logs = await prisma.errorLog.findMany({
      where: {
        AND: [
          ...this.buildErrorLogConditions(whereFilters),
          ...(tenantSlug ? [this.buildTenantSlugWhere(tenantSlug)] : []),
        ],
      },
      orderBy: { [sortField]: sortOrder },
      take,
      skip,
      select: {
        id: true,
        level: true,
        message: true,
        stack_trace: true,
        user_id: true,
        username: true,
        tenant_slug: true,
        route: true,
        method: true,
        ip_address: true,
        user_agent: true,
        request_body: true,
        request_params: true,
        request_query: true,
        error_code: true,
        context: true,
        created_at: true,
      },
    });

    return logs;
  }

  /**
   * Get error logs count with filters
   */
  static async getErrorLogsCount(
    filters: ErrorLogFilters = {},
  ): Promise<number> {
    const { tenantSlug, ...whereFilters } = filters;

    return prisma.errorLog.count({
      where: {
        AND: [
          ...this.buildErrorLogConditions(whereFilters),
          ...(tenantSlug ? [this.buildTenantSlugWhere(tenantSlug)] : []),
        ],
      },
    });
  }

  /**
   * Get error logs by level
   */
  static async getErrorLogsByLevel(
    level: string,
    take: number = 100,
  ): Promise<
    Array<{
      id: string;
      level: string;
      message: string;
      stack_trace: string | null;
      user_id: string | null;
      username: string | null;
      route: string | null;
      method: string | null;
      ip_address: string | null;
      user_agent: string | null;
      request_body: JsonValue | null;
      request_params: JsonValue | null;
      request_query: JsonValue | null;
      error_code: string | null;
      context: JsonValue | null;
      created_at: Date;
    }>
  > {
    return this.getErrorLogs({ level, take });
  }

  /**
   * Get error logs by user
   */
  static async getErrorLogsByUser(
    userId: string,
    take: number = 100,
  ): Promise<
    Array<{
      id: string;
      level: string;
      message: string;
      stack_trace: string | null;
      user_id: string | null;
      username: string | null;
      route: string | null;
      method: string | null;
      ip_address: string | null;
      user_agent: string | null;
      request_body: JsonValue | null;
      request_params: JsonValue | null;
      request_query: JsonValue | null;
      error_code: string | null;
      context: JsonValue | null;
      created_at: Date;
    }>
  > {
    return this.getErrorLogs({ userId, take });
  }

  /**
   * Get error statistics
   */
  static async getErrorStats(timeRange?: {
    startDate?: string;
    endDate?: string;
    tenantSlug?: string;
  }): Promise<ErrorStats> {
    const tenantSlug = timeRange?.tenantSlug;
    const where = {
      AND: [
        ...this.buildErrorLogConditions({
          startDate: timeRange?.startDate,
          endDate: timeRange?.endDate,
        }),
        ...(tenantSlug ? [this.buildTenantSlugWhere(tenantSlug)] : []),
      ],
    };

    // 交给数据库做聚合：早先的实现是把命中的行整表 findMany 回来再在内存里计数，
    // ErrorLog 是持续增长的日志表，时间范围一宽就会把整段日志拉进进程。
    // 与 slow-query 模块的 getStats 保持同一套写法。
    const [total, byLevel, byRoute, byErrorCode] = await Promise.all([
      prisma.errorLog.count({ where: where as never }),
      prisma.errorLog.groupBy({
        by: ["level"],
        where: where as never,
        _count: { id: true },
      }),
      prisma.errorLog.groupBy({
        by: ["route"],
        where: where as never,
        _count: { id: true },
      }),
      prisma.errorLog.groupBy({
        by: ["error_code"],
        where: where as never,
        _count: { id: true },
      }),
    ]);

    /** groupBy 会把 NULL 单独分一组；这些行没有该维度，不计入分布。 */
    const tally = <K extends string>(
      rows: Array<Record<K, string | null> & { _count: { id: number } }>,
      key: K,
    ): Record<string, number> => {
      const out: Record<string, number> = {};
      for (const row of rows) {
        const value = row[key];
        if (value) out[value] = row._count.id;
      }
      return out;
    };

    return {
      total,
      by_level: tally(byLevel, "level"),
      by_route: tally(byRoute, "route"),
      by_error_code: tally(byErrorCode, "error_code"),
    };
  }

  /**
   * Clean up old error logs
   */
  static async cleanupOldLogs(
    daysToKeep: number = 30,
    userId?: string,
    tenantSlug?: string,
  ): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.errorLog.deleteMany({
      where: {
        AND: [
          { created_at: { lt: cutoffDate } },
          ...(userId ? [{ user_id: userId }] : []),
          ...(tenantSlug ? [this.buildTenantSlugWhere(tenantSlug)] : []),
        ],
      },
    });

    return result.count;
  }

  /**
   * Get a single error log by ID
   */
  static async getErrorLogById(
    id: string,
    tenantSlug: string,
  ): Promise<{
    id: string;
    level: string;
    message: string;
    stack_trace: string | null;
    user_id: string | null;
    username: string | null;
    tenant_slug: string | null;
    route: string | null;
    method: string | null;
    ip_address: string | null;
    user_agent: string | null;
    request_body: JsonValue | null;
    request_params: JsonValue | null;
    request_query: JsonValue | null;
    error_code: string | null;
    context: JsonValue | null;
    created_at: Date;
  } | null> {
    const log = await prisma.errorLog.findFirst({
      where: {
        AND: [{ id }, this.buildTenantSlugWhere(tenantSlug)],
      },
      select: {
        id: true,
        level: true,
        message: true,
        stack_trace: true,
        user_id: true,
        username: true,
        tenant_slug: true,
        route: true,
        method: true,
        ip_address: true,
        user_agent: true,
        request_body: true,
        request_params: true,
        request_query: true,
        error_code: true,
        context: true,
        created_at: true,
      },
    });

    return log;
  }

  /**
   * Delete a single error log by ID
   */
  static async deleteErrorLog(id: string, tenantSlug: string): Promise<void> {
    await prisma.errorLog.deleteMany({
      where: {
        AND: [{ id }, this.buildTenantSlugWhere(tenantSlug)],
      },
    });
  }
}
